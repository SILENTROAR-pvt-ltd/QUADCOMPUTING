-- ============================================================================
-- 20261006000006_atomic_guest_order_and_inventory_idempotency.sql
--
-- 1. submit_guest_order_atomic: wraps guest order insert/update + order_items
--    insert + kitchen_tickets insert + dine_in_sessions/restaurant_tables sync
--    in one transaction. The TypeScript layer previously did these as 3-4
--    separate sequential Supabase calls with a swallowed catch on failure
--    (lib/services/guest-order/order-db-sync.util.ts), risking an order row
--    with no items/KOT, or a KOT with no order, on partial failure.
--
-- 2. deduct_recipe_inventory_for_order idempotency guard: the existing RPC
--    (20261004000003) has no protection against being called twice for the
--    same order. It is already called automatically from update_kot_status
--    when a ticket transitions to SERVED (20261006000001), AND separately at
--    bill settlement — so a single order's stock could be deducted multiple
--    times today. This adds an atomic check-and-set flag so repeat calls for
--    the same order are a safe no-op.
-- ============================================================================

-- ── Part 1: inventory-deduction idempotency ─────────────────────────────────

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS inventory_deducted_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.deduct_recipe_inventory_for_order(
    p_order_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order record;
    v_item record;
    v_recipe record;
    v_raw_item record;
    v_qty_to_deduct numeric;
    v_new_stock numeric;
    v_deductions_count int := 0;
    v_low_stock_alerts_count int := 0;
BEGIN
    SET LOCAL statement_timeout = '4000ms';
    SET LOCAL lock_timeout = '2500ms';

    -- Atomic check-and-set: only the first caller for this order proceeds.
    -- Row-locked so a concurrent KOT-served transition and a settlement call
    -- racing each other can't both pass the guard.
    UPDATE public.orders
    SET inventory_deducted_at = now()
    WHERE id = p_order_id AND inventory_deducted_at IS NULL
    RETURNING * INTO v_order;

    IF NOT FOUND THEN
        -- Either the order doesn't exist, or inventory was already deducted for it.
        SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND');
        END IF;
        RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'already_deducted', true, 'deductions_count', 0);
    END IF;

    FOR v_item IN
        SELECT item_id, quantity
        FROM public.order_items
        WHERE order_id = p_order_id
    LOOP
        FOR v_recipe IN
            SELECT raw_item_id, quantity_required
            FROM public.recipe_ingredients
            WHERE catalog_item_id::text = v_item.item_id::text
        LOOP
            v_qty_to_deduct := COALESCE(v_recipe.quantity_required, 0) * COALESCE(v_item.quantity, 1);

            IF v_qty_to_deduct > 0 THEN
                SELECT * INTO v_raw_item
                FROM public.raw_inventory_items
                WHERE id = v_recipe.raw_item_id
                FOR UPDATE;

                IF FOUND THEN
                    v_new_stock := GREATEST(0, v_raw_item.current_stock - v_qty_to_deduct);

                    UPDATE public.raw_inventory_items
                    SET current_stock = v_new_stock,
                        updated_at = now()
                    WHERE id = v_raw_item.id;

                    INSERT INTO public.inventory_logs (
                        business_id, item_id, change_amount, action_type, notes,
                        unit_cost_at_time, total_cost, logged_at
                    ) VALUES (
                        v_order.business_id, v_raw_item.id, -v_qty_to_deduct, 'CONSUMPTION',
                        'Auto-deducted for Order ' || p_order_id,
                        COALESCE(v_raw_item.cost_per_unit, 0),
                        COALESCE(v_raw_item.cost_per_unit, 0) * v_qty_to_deduct,
                        now()
                    );

                    v_deductions_count := v_deductions_count + 1;

                    IF v_new_stock <= COALESCE(v_raw_item.threshold, 5) THEN
                        INSERT INTO public.staff_notifications (
                            business_id, notification_type, message, status, created_at
                        ) VALUES (
                            v_order.business_id,
                            'LOW_STOCK_ALERT',
                            'Low Stock Warning: ' || v_raw_item.item_name || ' is at ' || v_new_stock || ' ' || COALESCE(v_raw_item.unit, 'units') || ' (Threshold: ' || COALESCE(v_raw_item.threshold, 5) || ')',
                            'PENDING',
                            now()
                        );
                        v_low_stock_alerts_count := v_low_stock_alerts_count + 1;
                    END IF;
                END IF;
            END IF;
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'already_deducted', false,
        'deductions_count', v_deductions_count,
        'low_stock_alerts_count', v_low_stock_alerts_count
    );
END;
$$;

DO $$ BEGIN
    GRANT EXECUTE ON FUNCTION public.deduct_recipe_inventory_for_order(uuid) TO authenticated, service_role;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ── Part 2: atomic guest order + order_items + kitchen_tickets + session/table sync ──

CREATE OR REPLACE FUNCTION public.submit_guest_order_atomic(
    p_business_id uuid,
    p_table_number text,
    p_order_id uuid,
    p_is_addon boolean,
    p_order_items jsonb,
    p_aggregated_items jsonb,
    p_subtotal numeric,
    p_tax_amount numeric,
    p_grand_total numeric,
    p_idempotency_key text DEFAULT NULL,
    p_customer_name text DEFAULT NULL,
    p_customer_phone text DEFAULT NULL,
    p_guest_handle text DEFAULT NULL,
    p_ticket_number text DEFAULT NULL,
    p_ticket_items jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing_order record;
    v_session_id uuid;
    v_kot_id uuid := gen_random_uuid();
    v_updated_count int;
BEGIN
    SET LOCAL statement_timeout = '4000ms';
    SET LOCAL lock_timeout = '2500ms';

    IF p_business_id IS NULL OR p_table_number IS NULL OR trim(p_table_number) = '' THEN
        RAISE EXCEPTION 'business_id and table_number are required';
    END IF;

    -- Idempotency guard: a retried submission with the same key returns the
    -- already-created order rather than creating a duplicate.
    IF p_idempotency_key IS NOT NULL THEN
        SELECT * INTO v_existing_order
        FROM public.orders
        WHERE business_id = p_business_id AND idempotency_key = p_idempotency_key;

        IF FOUND THEN
            RETURN jsonb_build_object(
                'success', true,
                'is_duplicate', true,
                'order_id', v_existing_order.id,
                'ticket_number', 'KOT-ACK'
            );
        END IF;
    END IF;

    -- Resolve (and lock) the active dine-in session for this table, if any,
    -- so a concurrent settlement closing the session can't race this insert.
    SELECT id INTO v_session_id
    FROM public.dine_in_sessions
    WHERE business_id = p_business_id
      AND table_number = p_table_number
      AND status IN ('open', 'bill_requested')
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF p_is_addon THEN
        UPDATE public.orders
        SET items = p_aggregated_items,
            subtotal = p_subtotal,
            tax_amount = p_tax_amount,
            grand_total = p_grand_total,
            total_amount = p_grand_total,
            session_id = COALESCE(session_id, v_session_id)
        WHERE id = p_order_id AND business_id = p_business_id;

        GET DIAGNOSTICS v_updated_count = ROW_COUNT;
        IF v_updated_count = 0 THEN
            RAISE EXCEPTION 'ORDER_NOT_FOUND: Order % not found for business % during add-on update', p_order_id, p_business_id;
        END IF;
    ELSE
        INSERT INTO public.orders (
            id, business_id, table_number, order_source, order_type, status,
            subtotal, tax_amount, grand_total, total_amount, items,
            idempotency_key, customer_name, customer_phone, session_id, created_at
        ) VALUES (
            p_order_id, p_business_id, p_table_number, 'QR_GUEST', 'pos', 'open',
            p_subtotal, p_tax_amount, p_grand_total, p_grand_total, p_aggregated_items,
            p_idempotency_key, p_customer_name, p_customer_phone, v_session_id, now()
        );
    END IF;

    -- Only the NEW items from this submission become order_items rows (the
    -- cumulative/aggregated view lives in orders.items).
    INSERT INTO public.order_items (order_id, item_id, item_name, price, quantity, notes, kot_status, created_at)
    SELECT
        p_order_id,
        (elem->>'item_id'),
        COALESCE(elem->>'item_name', 'Curated Dish'),
        COALESCE((elem->>'price')::numeric, 0),
        GREATEST(1, COALESCE((elem->>'quantity')::integer, 1)),
        (elem->>'notes'),
        'pending',
        now()
    FROM jsonb_array_elements(p_order_items) AS elem;

    INSERT INTO public.kitchen_tickets (id, business_id, order_id, ticket_number, table_or_room, items, status, created_at, updated_at)
    VALUES (
        v_kot_id, p_business_id, p_order_id,
        COALESCE(p_ticket_number, 'KOT-' || substr(v_kot_id::text, 1, 4)),
        CASE WHEN p_is_addon THEN p_table_number || ' (Add-on KOT)' ELSE p_table_number END,
        p_ticket_items, 'PENDING', now(), now()
    );

    IF v_session_id IS NOT NULL THEN
        UPDATE public.dine_in_sessions
        SET status = 'open',
            updated_at = now(),
            guest_handle = COALESCE(p_guest_handle, guest_handle)
        WHERE id = v_session_id;
    END IF;

    UPDATE public.restaurant_tables
    SET status = 'OCCUPIED'
    WHERE business_id = p_business_id AND upper(table_number) = upper(p_table_number);

    RETURN jsonb_build_object(
        'success', true,
        'is_duplicate', false,
        'order_id', p_order_id,
        'is_addon', p_is_addon,
        'ticket_number', COALESCE(p_ticket_number, 'KOT-' || substr(v_kot_id::text, 1, 4)),
        'session_id', v_session_id
    );
EXCEPTION WHEN unique_violation THEN
    -- Concurrent retry with the same idempotency_key landed after our initial
    -- check but before our insert committed — return the winning row instead
    -- of surfacing a constraint-violation error to the guest.
    IF p_idempotency_key IS NOT NULL THEN
        SELECT * INTO v_existing_order
        FROM public.orders
        WHERE business_id = p_business_id AND idempotency_key = p_idempotency_key;
        IF FOUND THEN
            RETURN jsonb_build_object(
                'success', true,
                'is_duplicate', true,
                'order_id', v_existing_order.id,
                'ticket_number', 'KOT-ACK'
            );
        END IF;
    END IF;
    RAISE;
END;
$$;

DO $$ BEGIN
    REVOKE EXECUTE ON FUNCTION public.submit_guest_order_atomic(
        uuid, text, uuid, boolean, jsonb, jsonb, numeric, numeric, numeric, text, text, text, text, text, jsonb
    ) FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.submit_guest_order_atomic(
        uuid, text, uuid, boolean, jsonb, jsonb, numeric, numeric, numeric, text, text, text, text, text, jsonb
    ) TO authenticated, service_role;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
