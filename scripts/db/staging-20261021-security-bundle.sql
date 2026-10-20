-- Staging bundle: the three 2026-10-21 security migrations, verbatim and in order, for one paste into the staging
-- project's SQL editor. Generated from supabase/migrations; do not edit here, edit the migrations and regenerate:
--   Get-Content 20261021000001_security_remediation.sql, 20261021000002_admin_audit_logs.sql, 20261021000003_settlement_guards.sql
-- Each migration is safe to re-run. Afterwards run every block of scripts/db/launch-checks-20261021.sql.
-- ===== 20261021000001_security_remediation.sql =====
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


-- ===== 20261021000002_admin_audit_logs.sql =====
-- Append-only record of changes to a venue's configuration: business settings (GST, PIN status), staff access and the
-- menu price list. Written by triggers only; no client role can change or remove a row. Hand-apply in staging first,
-- after 20261021000001_security_remediation.sql. Re-running is safe.

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Nullable so a row with no venue still records. The insert is NOT wrapped in an exception handler on purpose: if it
    -- fails, the venue change fails with it. An unaudited change must not commit, and a dropped row is worse than a retry.
    business_id uuid,
    actor_id uuid,
    action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    table_name text NOT NULL,
    record_id text,
    old_data jsonb,
    new_data jsonb,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_business_created_idx
    ON public.admin_audit_logs (business_id, created_at DESC);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- A host reads the trail of venues they own. The super admin (app_metadata role, as in middleware.ts) reads all of it.
DROP POLICY IF EXISTS "Hosts and super admins read the audit trail" ON public.admin_audit_logs;
CREATE POLICY "Hosts and super admins read the audit trail" ON public.admin_audit_logs
    FOR SELECT TO authenticated
    USING (
        business_id IN (SELECT id FROM public.businesses WHERE host_id = auth.uid())
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    );

-- Append-only: triggers insert as the function owner. Nobody else writes, changes or removes a row, service_role included.
REVOKE ALL ON public.admin_audit_logs FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.admin_audit_logs TO authenticated;

CREATE OR REPLACE FUNCTION public.log_admin_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    -- Field access goes through jsonb, so the same code runs for INSERT, UPDATE and DELETE.
    v_row jsonb := to_jsonb(CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END);
    v_old jsonb := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END;
    v_new jsonb := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END;
BEGIN
    -- Secrets never enter the log: PIN columns (hashed and legacy plain-text) are removed from both snapshots.
    -- Legacy plain-text columns still exist on the audited tables (businesses.staff_pin, staff_profiles.pin_code).
    v_old := v_old - ARRAY['admin_pin', 'admin_pin_hash', 'staff_pin', 'staff_pin_hash', 'pin_code', 'pin_hash'];
    v_new := v_new - ARRAY['admin_pin', 'admin_pin_hash', 'staff_pin', 'staff_pin_hash', 'pin_code', 'pin_hash'];

    INSERT INTO public.admin_audit_logs (business_id, actor_id, action, table_name, record_id, old_data, new_data)
    VALUES (
        CASE WHEN TG_TABLE_NAME = 'businesses' THEN (v_row ->> 'id')::uuid ELSE (v_row ->> 'business_id')::uuid END,
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        v_row ->> 'id',
        v_old,
        v_new
    );
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_businesses ON public.businesses;
CREATE TRIGGER audit_businesses
    AFTER INSERT OR UPDATE OR DELETE ON public.businesses
    FOR EACH ROW EXECUTE FUNCTION public.log_admin_mutation();

DROP TRIGGER IF EXISTS audit_staff_profiles ON public.staff_profiles;
CREATE TRIGGER audit_staff_profiles
    AFTER INSERT OR UPDATE OR DELETE ON public.staff_profiles
    FOR EACH ROW EXECUTE FUNCTION public.log_admin_mutation();

DROP TRIGGER IF EXISTS audit_catalog_items ON public.catalog_items;
CREATE TRIGGER audit_catalog_items
    AFTER INSERT OR UPDATE OR DELETE ON public.catalog_items
    FOR EACH ROW EXECUTE FUNCTION public.log_admin_mutation();


-- ===== 20261021000003_settlement_guards.sql =====
-- Settlement guards from the source audit (run 2, NV-02 / NV-03 / NV-19). Hand-apply in staging first, after
-- 20261021000002_admin_audit_logs.sql. Re-running is safe. Same 12-argument signature as 20261009000003, so no
-- application change is needed to call it; the application changes that go with it are in lib/services/session.
--
-- What changes against 20261009000003:
--   1. The paid object is the dine-in session, so the session row is locked (FOR UPDATE, behind a per-session advisory
--      lock) and a session that is already closed refuses a second settlement: SESSION_ALREADY_SETTLED. Before, every
--      once-per-bill guard was keyed on the order row, so a repeat settlement under a fresh order id credited cashback
--      and charged the fee again (NV-03).
--   2. An order that is already settled is replayed, not re-settled: the call succeeds with no writes, cashback 0 and the
--      redemption amount already applied. The till's retry after a timeout therefore cannot change a settled bill.
--   3. The cashback base is never taken from the request alone (NV-19). It is the bill the server knows: the order's
--      stored lines (order_items), else the subtotal stored when the order was placed. The request's subtotal can only
--      lower it (a void at the till), never raise it. Cashback is also once per session, not once per order.
-- Everything else (IDOR checks, redemption rules, billing fields, table vacate) is unchanged.

BEGIN;

CREATE OR REPLACE FUNCTION public.execute_atomic_bill_settlement(
    p_session_id text,
    p_order_id text,
    p_table_number text,
    p_business_id uuid,
    p_grand_total numeric,
    p_subtotal numeric,
    p_discount_amount numeric DEFAULT 0,
    p_discount_type text DEFAULT 'percentage',
    p_redemption_code text DEFAULT NULL,
    p_guest_id text DEFAULT NULL,
    p_guest_handle text DEFAULT NULL,
    p_billing jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_wallet_id uuid;
    v_wallet_guest_id text;
    v_current_balance numeric := 0;
    v_redeem_amt numeric := 0;
    v_cashback_amt numeric := 0;
    v_cashback_base numeric := 0;
    v_server_base numeric := 0;
    v_line_total numeric := 0;
    v_redemption_rec record;
    v_redemption_replay boolean := false;
    v_target_guest_id text;
    v_business_text text := p_business_id::text;
    v_order_uuid uuid;
    v_session_uuid uuid;
    v_order_rec record;
    v_session_rec record;
    v_caller_role text;
    v_caller_uid uuid;
    v_is_authorized boolean := false;
    v_items_type text;
    c_uuid constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
BEGIN
    SET LOCAL statement_timeout = '4000ms';
    SET LOCAL lock_timeout = '2500ms';

    -- ── IDOR ownership verification (unchanged) ──
    v_caller_role := current_setting('request.jwt.claim.role', true);
    IF v_caller_role = 'authenticated' THEN
        BEGIN
            v_caller_uid := auth.uid();
        EXCEPTION WHEN OTHERS THEN
            v_caller_uid := NULL;
        END;

        IF v_caller_uid IS NOT NULL THEN
            SELECT EXISTS (
                SELECT 1 FROM public.businesses
                WHERE id = p_business_id AND host_id = v_caller_uid
            ) OR EXISTS (
                SELECT 1 FROM public.staff_profiles
                WHERE business_id = p_business_id AND auth_user_id = v_caller_uid
            ) INTO v_is_authorized;

            IF NOT v_is_authorized THEN
                RAISE EXCEPTION 'IDOR_ACCESS_DENIED: Caller % is not authorized for business %', v_caller_uid, p_business_id;
            END IF;
        END IF;
    END IF;

    IF p_order_id ~ c_uuid THEN
        v_order_uuid := p_order_id::uuid;
    END IF;
    IF p_session_id ~ c_uuid THEN
        v_session_uuid := p_session_id::uuid;
    END IF;

    -- ── One settlement at a time per bill ──
    -- The session is the paid object; where the bill has no session (a counter bill), the order is.
    IF v_session_uuid IS NOT NULL THEN
        PERFORM pg_advisory_xact_lock(hashtextextended('settle:session:' || v_session_uuid::text, 0));
    ELSIF v_order_uuid IS NOT NULL THEN
        PERFORM pg_advisory_xact_lock(hashtextextended('settle:order:' || v_order_uuid::text, 0));
    END IF;

    -- ── Cross-resource integrity, now on locked rows ──
    IF v_order_uuid IS NOT NULL THEN
        SELECT id, business_id, session_id, status, subtotal, grand_total, table_number
        INTO v_order_rec
        FROM public.orders
        WHERE id = v_order_uuid
          AND business_id = p_business_id
          AND (p_table_number IS NULL OR table_number ILIKE '%' || p_table_number || '%')
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'IDOR_RESOURCE_MISMATCH: Order % does not belong to business % or table %', p_order_id, p_business_id, p_table_number;
        END IF;

        -- The order's own session is the one being paid; a session id the till sends that names another session of the
        -- venue is refused rather than closed alongside.
        IF v_session_uuid IS NOT NULL AND v_order_rec.session_id IS NOT NULL AND v_order_rec.session_id <> v_session_uuid THEN
            RAISE EXCEPTION 'SESSION_ORDER_MISMATCH: Order % belongs to session %, not %', p_order_id, v_order_rec.session_id, p_session_id;
        END IF;
    END IF;

    IF v_session_uuid IS NOT NULL THEN
        SELECT id, business_id, status INTO v_session_rec
        FROM public.dine_in_sessions
        WHERE id = v_session_uuid AND business_id = p_business_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'IDOR_RESOURCE_MISMATCH: Session % does not belong to business %', p_session_id, p_business_id;
        END IF;
    END IF;

    -- ── Replay and repeat ──
    -- A bill that is already settled is answered, not settled again: the till's retry after a timeout sees the same
    -- result, and nothing is written. A closed session with a different, unsettled order is a second settlement of the
    -- same visit under a new order id, and is refused.
    IF v_order_rec.id IS NOT NULL AND lower(coalesce(v_order_rec.status, '')) IN ('settled', 'completed', 'paid', 'closed', 'billed') THEN
        IF p_redemption_code IS NOT NULL AND trim(p_redemption_code) <> '' THEN
            SELECT coalesce(applied_amount, 0) INTO v_redeem_amt
            FROM public.wallet_redemptions
            WHERE code = upper(trim(p_redemption_code))
              AND (business_id = v_business_text OR cafe_id = v_business_text)
              AND order_id = v_order_uuid
            LIMIT 1;
        END IF;
        RETURN jsonb_build_object(
            'success', true,
            'replayed', true,
            'cashback_credited', 0,
            'redeemed_amount', coalesce(v_redeem_amt, 0),
            'redemption_replayed', v_redeem_amt > 0,
            'guest_id', NULL,
            'table_number', p_table_number
        );
    END IF;

    IF v_session_rec.id IS NOT NULL AND lower(coalesce(v_session_rec.status, '')) = 'closed' THEN
        RAISE EXCEPTION 'SESSION_ALREADY_SETTLED: Session % was already settled; a new bill for this visit must open a new session', p_session_id;
    END IF;

    -- Only a real guest identity earns cashback / can redeem. No synthetic
    -- 'table_<n>' wallets: nobody can ever see or spend those.
    v_target_guest_id := NULLIF(btrim(COALESCE(p_guest_handle, p_guest_id, '')), '');

    -- ── The bill the server knows, read before the till's figures are written over it ──
    IF v_order_uuid IS NOT NULL THEN
        SELECT coalesce(sum(coalesce(price, 0) * coalesce(quantity, 1)), 0) INTO v_line_total
        FROM public.order_items
        WHERE order_id = v_order_uuid
          AND lower(coalesce(kot_status, '')) <> 'cancelled';
        v_server_base := CASE
            WHEN v_line_total > 0 THEN v_line_total
            WHEN coalesce(v_order_rec.subtotal, 0) > 0 THEN v_order_rec.subtotal
            ELSE 0
        END;
    END IF;

    -- ── Billing fields (same transaction as the settlement) ──
    IF p_billing IS NOT NULL AND v_order_uuid IS NOT NULL THEN
        UPDATE public.orders
        SET payment_method = CASE
                WHEN upper(p_billing->>'payment_method') IN ('UPI', 'CASH', 'CARD', 'SPLIT', 'WALLET')
                THEN upper(p_billing->>'payment_method')
                ELSE payment_method
            END,
            subtotal = COALESCE((p_billing->>'subtotal')::numeric, subtotal),
            tax_amount = COALESCE((p_billing->>'tax_amount')::numeric, tax_amount),
            discount_amount = COALESCE((p_billing->>'discount_amount')::numeric, discount_amount),
            discount_type = COALESCE(p_billing->>'discount_type', discount_type),
            discount_value = COALESCE((p_billing->>'discount_value')::numeric, discount_value)
        WHERE id = v_order_uuid;

        IF jsonb_typeof(p_billing->'items') = 'array' THEN
            SELECT data_type INTO v_items_type
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'items';

            IF v_items_type = 'jsonb' THEN
                UPDATE public.orders SET items = p_billing->'items' WHERE id = v_order_uuid;
            ELSIF v_items_type = 'json' THEN
                UPDATE public.orders SET items = (p_billing->'items')::json WHERE id = v_order_uuid;
            ELSIF v_items_type = 'text' THEN
                UPDATE public.orders SET items = (p_billing->'items')::text WHERE id = v_order_uuid;
            ELSE
                RAISE EXCEPTION 'ORDER_ITEMS_TYPE: unsupported orders.items column type %', v_items_type;
            END IF;
        END IF;
    END IF;

    -- ── Wallet redemption (unchanged) ──
    IF p_redemption_code IS NOT NULL AND trim(p_redemption_code) <> '' THEN
        SELECT * INTO v_redemption_rec
        FROM public.wallet_redemptions
        WHERE code = upper(trim(p_redemption_code))
          AND (business_id = v_business_text OR cafe_id = v_business_text)
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'REDEMPTION_NOT_FOUND: Redemption code % is not valid for this venue', p_redemption_code;
        END IF;

        IF v_redemption_rec.status = 'redeemed' THEN
            IF v_order_uuid IS NOT NULL AND v_redemption_rec.order_id = v_order_uuid THEN
                v_redemption_replay := true;
                v_redeem_amt := COALESCE(v_redemption_rec.applied_amount, 0);
            ELSE
                RAISE EXCEPTION 'REDEMPTION_ALREADY_USED: Code % was already redeemed at %', p_redemption_code, v_redemption_rec.redeemed_at;
            END IF;
        END IF;

        IF NOT v_redemption_replay THEN
            IF v_redemption_rec.status NOT IN ('pending', 'verified') THEN
                RAISE EXCEPTION 'REDEMPTION_NOT_USABLE: Code % is %', p_redemption_code, v_redemption_rec.status;
            END IF;

            IF v_redemption_rec.expires_at <= now() THEN
                RAISE EXCEPTION 'REDEMPTION_EXPIRED: Code % has expired', p_redemption_code;
            END IF;

            v_redeem_amt := round(COALESCE(p_discount_amount, 0), 2);

            IF v_redeem_amt <= 0 THEN
                RAISE EXCEPTION 'REDEMPTION_NOT_APPLIED: Code % needs a wallet discount on the bill', p_redemption_code;
            END IF;

            IF v_redeem_amt > round(v_redemption_rec.amount, 2) THEN
                RAISE EXCEPTION 'REDEMPTION_EXCEEDS_CODE: Discount % is more than code % is worth (%)', v_redeem_amt, p_redemption_code, round(v_redemption_rec.amount, 2);
            END IF;

            IF v_redeem_amt > round(COALESCE(NULLIF(p_subtotal, 0), p_grand_total, 0), 2) THEN
                RAISE EXCEPTION 'REDEMPTION_EXCEEDS_BILL: Discount % is more than the bill subtotal', v_redeem_amt;
            END IF;

            SELECT id, balance, guest_id INTO v_wallet_id, v_current_balance, v_wallet_guest_id
            FROM public.guest_wallets
            WHERE (id = v_redemption_rec.wallet_id
                   OR (v_redemption_rec.wallet_id IS NULL AND guest_id = v_redemption_rec.guest_id))
              AND (business_id = p_business_id OR cafe_id = v_business_text)
            FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'WALLET_NOT_FOUND: No wallet for code %', p_redemption_code;
            END IF;

            IF v_current_balance < v_redeem_amt THEN
                RAISE EXCEPTION 'INSUFFICIENT_WALLET_BALANCE: Wallet holds % but the discount is %', v_current_balance, v_redeem_amt;
            END IF;

            UPDATE public.guest_wallets
            SET balance = balance - v_redeem_amt,
                updated_at = now()
            WHERE id = v_wallet_id;

            INSERT INTO public.wallet_transactions(
                wallet_id, guest_id, business_id, cafe_id, table_number, order_id, transaction_type,
                rate, amount, balance_before, balance_after, description
            ) VALUES (
                v_wallet_id, v_wallet_guest_id, p_business_id, v_business_text, p_table_number, v_order_uuid, 'REDEMPTION',
                '100%', v_redeem_amt, v_current_balance, v_current_balance - v_redeem_amt,
                'Redeemed ₹' || v_redeem_amt || ' with code ' || upper(trim(p_redemption_code))
            );

            UPDATE public.wallet_redemptions
            SET status = 'redeemed',
                redeemed_at = now(),
                order_id = v_order_uuid,
                applied_amount = v_redeem_amt
            WHERE id = v_redemption_rec.id;
        END IF;
    END IF;

    -- ── 7% cashback on the bill the server knows ──
    -- Base: the order's stored lines, else its stored subtotal. The request's subtotal may only lower it (a void at the
    -- till). It is used alone only for a bill the server never priced (no lines and no stored subtotal).
    IF v_server_base > 0 THEN
        v_cashback_base := LEAST(v_server_base, COALESCE(NULLIF(p_subtotal, 0), v_server_base));
    ELSE
        v_cashback_base := COALESCE(NULLIF(p_subtotal, 0), p_grand_total, 0);
    END IF;
    v_cashback_base := GREATEST(0, v_cashback_base);
    v_cashback_amt := round(v_cashback_base * 0.07, 2);

    -- Once per order, and once per session: a second order of the same visit earns nothing more.
    IF v_target_guest_id IS NOT NULL AND v_cashback_amt > 0
       AND NOT (v_order_uuid IS NOT NULL AND EXISTS (
           SELECT 1 FROM public.wallet_transactions
           WHERE order_id = v_order_uuid AND transaction_type = 'CASHBACK'
       ))
       AND NOT (v_session_uuid IS NOT NULL AND EXISTS (
           SELECT 1 FROM public.wallet_transactions wt
           JOIN public.orders o ON o.id = wt.order_id
           WHERE o.session_id = v_session_uuid AND wt.transaction_type = 'CASHBACK'
       )) THEN

        SELECT id, balance INTO v_wallet_id, v_current_balance
        FROM public.guest_wallets
        WHERE guest_id = v_target_guest_id
          AND (business_id = p_business_id OR cafe_id = v_business_text)
        FOR UPDATE;

        IF NOT FOUND THEN
            v_current_balance := 0;
            INSERT INTO public.guest_wallets(guest_id, business_id, cafe_id, balance, total_cashback_earned)
            VALUES (v_target_guest_id, p_business_id, v_business_text, v_cashback_amt, v_cashback_amt)
            RETURNING id INTO v_wallet_id;
        ELSE
            UPDATE public.guest_wallets
            SET balance = balance + v_cashback_amt,
                total_cashback_earned = total_cashback_earned + v_cashback_amt,
                updated_at = now()
            WHERE id = v_wallet_id;
        END IF;

        INSERT INTO public.wallet_transactions(
            wallet_id, guest_id, business_id, cafe_id, table_number, order_id, transaction_type,
            rate, amount, balance_before, balance_after, description
        ) VALUES (
            v_wallet_id, v_target_guest_id, p_business_id, v_business_text, p_table_number, v_order_uuid, 'CASHBACK',
            '7%', v_cashback_amt, v_current_balance, v_current_balance + v_cashback_amt,
            '7% Cashback on Table ' || COALESCE(p_table_number, '')
        );
    ELSE
        v_cashback_amt := 0;
    END IF;

    -- ── Order / session / table state ──
    IF v_session_uuid IS NOT NULL THEN
        UPDATE public.dine_in_sessions
        SET status = 'closed', updated_at = now()
        WHERE id = v_session_uuid AND business_id = p_business_id;
    END IF;

    IF v_order_uuid IS NOT NULL THEN
        UPDATE public.orders
        SET status = 'settled',
            grand_total = p_grand_total
        WHERE id = v_order_uuid AND business_id = p_business_id;
    END IF;

    IF p_table_number IS NOT NULL AND p_table_number <> '' THEN
        UPDATE public.restaurant_tables
        SET status = 'VACANT'
        WHERE business_id = p_business_id
          AND upper(table_number) = upper(p_table_number);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'replayed', false,
        'cashback_credited', v_cashback_amt,
        'cashback_base', v_cashback_base,
        'redeemed_amount', v_redeem_amt,
        'redemption_replayed', v_redemption_replay,
        'guest_id', v_target_guest_id,
        'table_number', p_table_number
    );
END;
$$;

-- Server-only, as 20261021000001 made it. CREATE OR REPLACE keeps existing grants; this restates them so a database
-- that never ran that migration ends up in the same state.
REVOKE ALL ON FUNCTION public.execute_atomic_bill_settlement(text, text, text, uuid, numeric, numeric, numeric, text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_atomic_bill_settlement(text, text, text, uuid, numeric, numeric, numeric, text, text, text, text, jsonb) TO service_role;

COMMIT;

