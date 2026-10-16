-- ============================================================================
-- 20261016000012_guest_delivery.sql   (safe to re-run)
--
-- Guest delivery ordering. A delivery goes through the same order, KOT and billing pipeline as a table order:
--   1. the venue's delivery terms (radius, minimum order, fee, and the venue's own location) live on businesses;
--   2. each delivery gets its own table-like bill ("DLV-XXXXXXXX"), so it never joins a dine-in bill;
--   3. submit_guest_order_atomic takes an optional p_delivery object: the address, phone, checked distance, fee,
--      payment choice and the kitchen note. It writes them on the order, and the kitchen ticket shows the address.
-- The app checks radius, minimum order and fee again on the server (delivery-rules.ts) before this function is called;
-- the database only stores what the app decided.
--
-- Apply in the Supabase SQL editor, after 20261016000011. Only the previous 16-argument signature of
-- submit_guest_order_atomic is dropped; the new one has p_delivery as its last argument, defaulting to null, so a
-- dine-in order is unchanged.
-- ============================================================================

BEGIN;

ALTER TABLE public.businesses
    ADD COLUMN IF NOT EXISTS delivery_enabled boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS delivery_radius_km numeric(5,2) NOT NULL DEFAULT 5 CHECK (delivery_radius_km > 0 AND delivery_radius_km <= 100),
    ADD COLUMN IF NOT EXISTS delivery_min_order numeric(10,2) NOT NULL DEFAULT 0 CHECK (delivery_min_order >= 0),
    ADD COLUMN IF NOT EXISTS delivery_fee numeric(10,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
    ADD COLUMN IF NOT EXISTS delivery_lat numeric(9,6),
    ADD COLUMN IF NOT EXISTS delivery_lng numeric(9,6);

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS is_delivery boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS delivery_address text,
    ADD COLUMN IF NOT EXISTS delivery_phone text,
    ADD COLUMN IF NOT EXISTS delivery_lat numeric(9,6),
    ADD COLUMN IF NOT EXISTS delivery_lng numeric(9,6),
    ADD COLUMN IF NOT EXISTS delivery_distance_km numeric(6,2),
    ADD COLUMN IF NOT EXISTS delivery_fee numeric(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS delivery_payment text,
    ADD COLUMN IF NOT EXISTS delivery_paid boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS delivery_status text;

DO $$ BEGIN
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_delivery_payment_check;
    ALTER TABLE public.orders ADD CONSTRAINT orders_delivery_payment_check
        CHECK (delivery_payment IS NULL OR delivery_payment IN ('cod', 'upi_advance'));
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_delivery_status_check;
    ALTER TABLE public.orders ADD CONSTRAINT orders_delivery_status_check
        CHECK (delivery_status IS NULL OR delivery_status IN ('received', 'preparing', 'out_for_delivery', 'delivered'));
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_delivery_board
    ON public.orders (business_id, created_at DESC) WHERE is_delivery;

DROP FUNCTION IF EXISTS public.submit_guest_order_atomic(
    uuid, text, uuid, boolean, jsonb, jsonb, numeric, numeric, numeric, text, text, text, text, text, jsonb, integer
);

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
    p_ticket_items jsonb DEFAULT '[]'::jsonb,
    p_expected_item_rows integer DEFAULT NULL,
    p_delivery jsonb DEFAULT NULL
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
    v_norm text;
    v_open_count int;
    v_item_rows int;
BEGIN
    IF p_business_id IS NULL OR p_table_number IS NULL OR trim(p_table_number) = '' THEN
        RAISE EXCEPTION 'business_id and table_number are required';
    END IF;

    v_norm := upper(btrim(regexp_replace(p_table_number, '^(table|t-)\s*', '', 'i')));

    -- Orders for one table run one at a time. Taken before the timeouts below so a queue of guests is not cut short by them.
    PERFORM pg_advisory_xact_lock(hashtextextended(p_business_id::text || ':' || v_norm, 0));

    SET LOCAL statement_timeout = '4000ms';
    SET LOCAL lock_timeout = '2500ms';

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

    -- A decision made from an older view of the table is refused; the app reads the table again and retries.
    IF NOT p_is_addon THEN
        SELECT count(*) INTO v_open_count
        FROM public.orders
        WHERE business_id = p_business_id
          AND table_number IN (p_table_number, 'Table ' || p_table_number, 'T-' || v_norm)
          AND status NOT IN ('SETTLED', 'settled', 'COMPLETED', 'completed', 'CANCELLED', 'cancelled', 'billed', 'closed', 'CLOSED');
        IF v_open_count > 0 THEN
            RAISE EXCEPTION 'TABLE_STATE_CHANGED: table % already has an open bill', p_table_number;
        END IF;
    ELSIF p_expected_item_rows IS NOT NULL THEN
        SELECT count(*) INTO v_item_rows FROM public.order_items WHERE order_id = p_order_id;
        IF v_item_rows <> p_expected_item_rows THEN
            RAISE EXCEPTION 'TABLE_STATE_CHANGED: bill % changed since it was read', p_order_id;
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
            idempotency_key, customer_name, customer_phone, session_id, created_at,
            is_delivery, delivery_address, delivery_phone, delivery_lat, delivery_lng,
            delivery_distance_km, delivery_fee, delivery_payment, delivery_paid, delivery_status
        ) VALUES (
            p_order_id, p_business_id, p_table_number, 'QR_GUEST', 'pos', 'open',
            p_subtotal, p_tax_amount, p_grand_total, p_grand_total, p_aggregated_items,
            p_idempotency_key, p_customer_name, p_customer_phone, v_session_id, now(),
            p_delivery IS NOT NULL,
            p_delivery->>'address',
            p_delivery->>'phone',
            (p_delivery->>'lat')::numeric,
            (p_delivery->>'lng')::numeric,
            (p_delivery->>'distance_km')::numeric,
            COALESCE((p_delivery->>'fee')::numeric, 0),
            p_delivery->>'payment',
            false,
            CASE WHEN p_delivery IS NOT NULL THEN 'received' END
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

        INSERT INTO public.kitchen_tickets (id, business_id, order_id, ticket_number, table_or_room, items, status, station, notes, created_at, updated_at)
        VALUES (
            v_this_kot, p_business_id, p_order_id,
            CASE
                WHEN array_length(v_stations, 1) > 1
                    THEN COALESCE(p_ticket_number, 'KOT-' || substr(v_kot_id::text, 1, 4)) || '-' || upper(left(v_station, 1))
                ELSE COALESCE(p_ticket_number, 'KOT-' || substr(v_kot_id::text, 1, 4))
            END,
            CASE
                WHEN p_is_addon THEN p_table_number || ' (Add-on KOT)'
                WHEN p_delivery IS NOT NULL THEN 'Delivery ' || p_table_number
                ELSE p_table_number
            END,
            COALESCE(
                (SELECT jsonb_agg(elem - 'station')
                 FROM jsonb_array_elements(p_ticket_items) AS elem
                 WHERE COALESCE(NULLIF(trim(elem->>'station'), ''), 'Kitchen') = v_station),
                '[]'::jsonb
            ),
            'PENDING', v_station,
            CASE WHEN p_delivery IS NOT NULL THEN NULLIF(p_delivery->>'ticket_note', '') END,
            now(), now()
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
    -- check but before our insert committed: return the winning row instead
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
        uuid, text, uuid, boolean, jsonb, jsonb, numeric, numeric, numeric, text, text, text, text, text, jsonb, integer, jsonb
    ) FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.submit_guest_order_atomic(
        uuid, text, uuid, boolean, jsonb, jsonb, numeric, numeric, numeric, text, text, text, text, text, jsonb, integer, jsonb
    ) TO authenticated, service_role;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
