-- ============================================================================
-- 20261010000005_void_pending_order_line.sql   (safe to re-run)
--
-- Live tables: the host changes an item on a table's bill, but only while the kitchen has not
-- started it. One transaction does all of it:
--   * sets the line's quantity, or deletes the line when the quantity is 0,
--   * recalculates the order's subtotal, tax (same effective rate), grand total and item list,
--   * changes the same dish on its unstarted kitchen ticket, and cancels the ticket if it is now empty.
-- A line the kitchen has started (preparing, ready, served) is refused, not changed.
-- Service role only. Apply in the Supabase SQL editor. Nothing is dropped.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.edit_pending_order_line(
    p_business_id uuid,
    p_order_item_id uuid,
    p_quantity integer,
    p_staff_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_line record;
    v_order record;
    v_removing boolean;
    v_new_subtotal numeric;
    v_new_tax numeric;
    v_new_items jsonb;
    v_ticket record;
    v_ticket_items jsonb;
    v_remaining jsonb;
    v_idx int;
    v_hit boolean := false;
    v_now timestamptz := timezone('utc'::text, now());
BEGIN
    SET LOCAL statement_timeout = '4000ms';
    SET LOCAL lock_timeout = '2500ms';

    v_removing := COALESCE(p_quantity, 0) <= 0;
    IF NOT v_removing AND p_quantity > 50 THEN
        RAISE EXCEPTION 'QUANTITY_INVALID';
    END IF;

    SELECT * INTO v_line
    FROM public.order_items
    WHERE id = p_order_item_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'LINE_NOT_FOUND';
    END IF;

    SELECT * INTO v_order
    FROM public.orders
    WHERE id = v_line.order_id AND business_id = p_business_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'LINE_NOT_FOUND';
    END IF;

    IF lower(coalesce(v_order.status, '')) IN ('settled', 'closed', 'cancelled', 'completed') THEN
        RAISE EXCEPTION 'ORDER_CLOSED';
    END IF;

    IF lower(coalesce(v_line.kot_status, '')) <> 'pending' THEN
        RAISE EXCEPTION 'LINE_STARTED';
    END IF;

    IF v_removing THEN
        DELETE FROM public.order_items WHERE id = p_order_item_id;
    ELSE
        UPDATE public.order_items SET quantity = p_quantity WHERE id = p_order_item_id;
    END IF;

    -- Totals from the lines that remain. Tax keeps the order's own effective rate.
    SELECT COALESCE(SUM(price * quantity), 0) INTO v_new_subtotal
    FROM public.order_items
    WHERE order_id = v_order.id AND lower(coalesce(kot_status, '')) <> 'cancelled';

    IF COALESCE(v_order.subtotal, 0) > 0 THEN
        v_new_tax := round(COALESCE(v_order.tax_amount, 0) * v_new_subtotal / v_order.subtotal, 2);
    ELSE
        v_new_tax := 0;
    END IF;

    -- The bill's item list, rebuilt the same way the order was first written.
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', g.line_key,
        'name', g.item_name,
        'price', g.unit_price,
        'qty', g.qty,
        'notes', g.notes,
        'kot_status', g.kot_status
    ) ORDER BY g.item_name), '[]'::jsonb) INTO v_new_items
    FROM (
        SELECT COALESCE(item_id::text, item_name) AS line_key,
               item_name,
               price AS unit_price,
               SUM(quantity)::int AS qty,
               MAX(notes) AS notes,
               MAX(kot_status) AS kot_status
        FROM public.order_items
        WHERE order_id = v_order.id AND lower(coalesce(kot_status, '')) <> 'cancelled'
        GROUP BY COALESCE(item_id::text, item_name), item_name, price
    ) g;

    UPDATE public.orders
    SET items = v_new_items,
        subtotal = v_new_subtotal,
        tax_amount = v_new_tax,
        grand_total = v_new_subtotal + v_new_tax,
        total_amount = v_new_subtotal + v_new_tax,
        updated_at = v_now
    WHERE id = v_order.id;

    -- The same dish on the open kitchen ticket for this order: its quantity changes, or it comes off.
    v_hit := false;
    FOR v_ticket IN
        SELECT * FROM public.kitchen_tickets
        WHERE order_id = v_order.id AND upper(status) = 'PENDING'
        ORDER BY created_at
        FOR UPDATE
    LOOP
        v_ticket_items := COALESCE(v_ticket.items, '[]'::jsonb);
        v_remaining := '[]'::jsonb;
        v_hit := false;

        FOR v_idx IN 0 .. jsonb_array_length(v_ticket_items) - 1 LOOP
            IF NOT v_hit AND (v_ticket_items -> v_idx ->> 'name') = v_line.item_name THEN
                v_hit := true;
                IF NOT v_removing THEN
                    v_remaining := v_remaining || jsonb_build_array(jsonb_set(v_ticket_items -> v_idx, '{qty}', to_jsonb(p_quantity)));
                END IF;
            ELSE
                v_remaining := v_remaining || jsonb_build_array(v_ticket_items -> v_idx);
            END IF;
        END LOOP;

        IF v_hit THEN
            UPDATE public.kitchen_tickets
            SET items = v_remaining,
                status = CASE WHEN v_removing AND jsonb_array_length(v_remaining) = 0 THEN 'CANCELLED' ELSE status END,
                status_history = CASE
                    WHEN v_removing AND jsonb_array_length(v_remaining) = 0
                        THEN COALESCE(status_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
                            'from', 'PENDING', 'to', 'CANCELLED', 'at', v_now, 'staff_id', p_staff_id))
                    ELSE status_history
                END,
                updated_at = v_now
            WHERE id = v_ticket.id;
            EXIT;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order.id,
        'item', v_line.item_name,
        'removed', v_removing,
        'quantity', CASE WHEN v_removing THEN 0 ELSE p_quantity END,
        'subtotal', v_new_subtotal,
        'tax_amount', v_new_tax,
        'grand_total', v_new_subtotal + v_new_tax,
        'ticket_updated', v_hit
    );
END;
$$;

-- Removing a line is the same change with quantity 0.
CREATE OR REPLACE FUNCTION public.void_pending_order_line(
    p_business_id uuid,
    p_order_item_id uuid,
    p_staff_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN public.edit_pending_order_line(p_business_id, p_order_item_id, 0, p_staff_id);
END;
$$;

REVOKE ALL ON FUNCTION public.edit_pending_order_line(uuid, uuid, integer, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.edit_pending_order_line(uuid, uuid, integer, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.edit_pending_order_line(uuid, uuid, integer, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.edit_pending_order_line(uuid, uuid, integer, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.void_pending_order_line(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.void_pending_order_line(uuid, uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.void_pending_order_line(uuid, uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.void_pending_order_line(uuid, uuid, uuid) TO service_role;

COMMIT;
