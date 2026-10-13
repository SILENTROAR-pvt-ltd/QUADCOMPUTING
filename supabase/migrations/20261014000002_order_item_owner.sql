-- ============================================================================
-- 20261014000002_order_item_owner.sql   (safe to re-run)
--
-- Who ordered each dish, for cashback on shared tables.
-- 1. order_items.guest_handle: the signed-in guest who ordered the dish (from their verified sign-in on
--    the server, never from the browser). NULL for a guest without an account.
-- 2. submit_guest_order_atomic writes it, and no longer stamps the ordering guest onto the table's shared
--    dine-in session (that moved the whole table's cashback to whoever ordered last).
-- Everything else in the function is unchanged from 20261010000004_kitchen_station_routing.sql.
-- Cashback is credited to one guest only when they ordered every dish on the bill (bill-owner.util.ts).
-- Apply in the Supabase SQL editor. Nothing is dropped.
-- ============================================================================

BEGIN;

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS guest_handle TEXT;
CREATE INDEX IF NOT EXISTS order_items_order_id_guest_handle_idx ON public.order_items (order_id, guest_handle);

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
    v_stations text[];
    v_station text;
    v_this_kot uuid;
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
    -- cumulative/aggregated view lives in orders.items). Each row records who ordered it.
    INSERT INTO public.order_items (order_id, item_id, item_name, price, quantity, notes, kot_status, guest_handle, created_at)
    SELECT
        p_order_id,
        (elem->>'item_id'),
        COALESCE(elem->>'item_name', 'Curated Dish'),
        COALESCE((elem->>'price')::numeric, 0),
        GREATEST(1, COALESCE((elem->>'quantity')::integer, 1)),
        (elem->>'notes'),
        'pending',
        NULLIF(btrim(COALESCE(elem->>'guest_handle', '')), ''),
        now()
    FROM jsonb_array_elements(p_order_items) AS elem;

    -- One kitchen ticket per station in this submission. The first station keeps the
    -- ticket number and id the order always had; further stations get a letter suffix.
    SELECT array_agg(s ORDER BY s) INTO v_stations
    FROM (
        SELECT DISTINCT COALESCE(NULLIF(trim(elem->>'station'), ''), 'Kitchen') AS s
        FROM jsonb_array_elements(p_ticket_items) AS elem
    ) q;
    IF v_stations IS NULL THEN
        v_stations := ARRAY['Kitchen'];
    END IF;

    FOREACH v_station IN ARRAY v_stations LOOP
        v_this_kot := CASE WHEN v_station = v_stations[1] THEN v_kot_id ELSE gen_random_uuid() END;

        INSERT INTO public.kitchen_tickets (id, business_id, order_id, ticket_number, table_or_room, items, status, station, created_at, updated_at)
        VALUES (
            v_this_kot, p_business_id, p_order_id,
            CASE
                WHEN array_length(v_stations, 1) > 1
                    THEN COALESCE(p_ticket_number, 'KOT-' || substr(v_kot_id::text, 1, 4)) || '-' || upper(left(v_station, 1))
                ELSE COALESCE(p_ticket_number, 'KOT-' || substr(v_kot_id::text, 1, 4))
            END,
            CASE WHEN p_is_addon THEN p_table_number || ' (Add-on KOT)' ELSE p_table_number END,
            COALESCE(
                (SELECT jsonb_agg(elem - 'station')
                 FROM jsonb_array_elements(p_ticket_items) AS elem
                 WHERE COALESCE(NULLIF(trim(elem->>'station'), ''), 'Kitchen') = v_station),
                '[]'::jsonb
            ),
            'PENDING', v_station, now(), now()
        );
    END LOOP;

    -- The session is shared by everyone at the table, so it never takes the ordering guest's handle.
    IF v_session_id IS NOT NULL THEN
        UPDATE public.dine_in_sessions
        SET status = 'open',
            updated_at = now()
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

COMMIT;

-- Let the API see the new column straight away (PostgREST caches the schema).
NOTIFY pgrst, 'reload schema';

-- ----------------------------------------------------------------------------
-- AUDIT (read-only), after applying:
--   select column_name from information_schema.columns
--   where table_schema = 'public' and table_name = 'order_items' and column_name = 'guest_handle';
--   -- expect one row
--   select item_name, guest_handle, created_at from public.order_items order by created_at desc limit 10;
--   -- a signed-in guest's new dishes carry their @handle; dishes from a guest without an account are NULL
-- ----------------------------------------------------------------------------
