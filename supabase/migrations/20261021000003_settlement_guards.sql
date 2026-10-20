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
