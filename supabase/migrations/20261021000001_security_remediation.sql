-- Security remediation from the source audit (run 1). Each block names the lead it closes.
-- Hand-apply in the Supabase SQL editor after the staging run. Re-running is safe.

-- 1. Server-only functions. Client roles lose EXECUTE on every money, ordering, provisioning and PIN function.
--    The app calls each of them with the service client. This also reverses the blanket
--    GRANT EXECUTE ON ALL FUNCTIONS ... TO anon, authenticated in 20261006000004 for these names.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'deduct_venue_wallet_credits', 'execute_atomic_bill_settlement', 'submit_guest_order_atomic',
        'provision_host_business', 'update_kot_status', 'verify_staff_pin', 'create_reservation_atomic'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- 2. The legacy master PIN default '0000' was never a PIN an owner chose. Clear it so no venue is locked by it.
--    (Venues whose hash was derived from '0000' must reset their PIN: a hash cannot be recognised here.)
UPDATE public.businesses SET admin_pin = NULL WHERE admin_pin = '0000' AND admin_pin_hash IS NULL;

-- 3. Staff sessions carry a version. A PIN, role or access change bumps it, which ends every older session.
ALTER TABLE public.staff_profiles ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0;

-- 4. Kitchen state machine. A cancel now touches only the lines the kitchen has not started, and cancels the order
--    only when nothing on it was started. Served or cooking lines of the same bill are never overwritten, so a
--    cancelled round cannot free a table with cooked food unpaid. Everything else is unchanged from 20261006000001.
CREATE OR REPLACE FUNCTION public.update_kot_status(
    p_ticket_id UUID,
    p_new_status TEXT,
    p_staff_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ticket RECORD;
    v_updated_ticket RECORD;
    v_current_status TEXT;
    v_target_status TEXT;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_history_entry JSONB;
BEGIN
    IF p_ticket_id IS NULL THEN
        RAISE EXCEPTION 'p_ticket_id is required';
    END IF;
    IF p_new_status IS NULL OR trim(p_new_status) = '' THEN
        RAISE EXCEPTION 'p_new_status is required';
    END IF;

    SELECT * INTO v_ticket
    FROM public.kitchen_tickets
    WHERE id = p_ticket_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Kitchen ticket % not found', p_ticket_id;
    END IF;

    v_current_status := upper(trim(v_ticket.status));
    v_target_status := upper(trim(p_new_status));

    IF v_target_status NOT IN ('PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELLED') THEN
        RAISE EXCEPTION 'Invalid target status: %', p_new_status;
    END IF;

    IF v_current_status = v_target_status THEN
        RETURN jsonb_build_object(
            'success', true,
            'ticket_id', p_ticket_id,
            'status', v_target_status,
            'previous_status', v_current_status,
            'idempotent', true,
            'ticket', to_jsonb(v_ticket)
        );
    END IF;

    IF NOT (
        (v_current_status = 'PENDING' AND v_target_status IN ('PREPARING', 'CANCELLED')) OR
        (v_current_status = 'PREPARING' AND v_target_status IN ('READY', 'CANCELLED')) OR
        (v_current_status = 'READY' AND v_target_status IN ('SERVED', 'CANCELLED'))
    ) THEN
        RAISE EXCEPTION 'Invalid KOT status transition from % to % for ticket %', v_current_status, v_target_status, p_ticket_id;
    END IF;

    v_history_entry := jsonb_build_object(
        'from', v_current_status,
        'to', v_target_status,
        'at', v_now,
        'staff_id', p_staff_id
    );

    UPDATE public.kitchen_tickets
    SET status = v_target_status,
        updated_at = v_now,
        staff_id = COALESCE(p_staff_id, staff_id),
        status_history = COALESCE(status_history, '[]'::jsonb) || v_history_entry
    WHERE id = p_ticket_id
    RETURNING * INTO v_updated_ticket;

    INSERT INTO public.kot_status_logs (
        ticket_id,
        previous_status,
        new_status,
        changed_by,
        created_at
    ) VALUES (
        p_ticket_id,
        v_current_status,
        v_target_status,
        p_staff_id,
        v_now
    );

    IF v_ticket.order_id IS NOT NULL THEN
        IF v_target_status = 'CANCELLED' THEN
            -- Only lines the kitchen has not started are cancelled. Cooking or served lines of the same bill stay as they are.
            UPDATE public.order_items
            SET kot_status = 'cancelled'
            WHERE order_id = v_ticket.order_id
              AND lower(coalesce(kot_status, '')) IN ('', 'pending');

            -- The order is cancelled only when nothing on it has been started.
            IF NOT EXISTS (
                SELECT 1 FROM public.order_items
                WHERE order_id = v_ticket.order_id
                  AND lower(coalesce(kot_status, '')) NOT IN ('', 'pending', 'cancelled')
            ) THEN
                UPDATE public.orders
                SET status = 'cancelled', updated_at = v_now
                WHERE id = v_ticket.order_id
                  AND status NOT IN ('settled', 'SETTLED', 'closed', 'CLOSED');
            END IF;
        ELSE
            UPDATE public.order_items
            SET kot_status = CASE
                WHEN v_target_status = 'PREPARING' THEN 'preparing'
                WHEN v_target_status = 'READY' THEN 'ready'
                WHEN v_target_status = 'SERVED' THEN 'served'
                ELSE kot_status
            END
            WHERE order_id = v_ticket.order_id;

            UPDATE public.orders
            SET status = CASE
                WHEN v_target_status = 'PREPARING' THEN 'preparing'
                WHEN v_target_status = 'READY' THEN 'ready'
                WHEN v_target_status = 'SERVED' THEN 'served'
                ELSE status
            END,
            updated_at = v_now
            WHERE id = v_ticket.order_id
              AND status NOT IN ('settled', 'SETTLED', 'closed', 'CLOSED');
        END IF;
    END IF;

    IF v_target_status = 'SERVED' AND v_ticket.order_id IS NOT NULL THEN
        BEGIN
            PERFORM public.deduct_recipe_inventory_for_order(v_ticket.order_id);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Inventory recipe deduction note for order %: %', v_ticket.order_id, SQLERRM;
        END;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'ticket_id', p_ticket_id,
        'previous_status', v_current_status,
        'status', v_target_status,
        'ticket', to_jsonb(v_updated_ticket)
    );
END;
$$;
