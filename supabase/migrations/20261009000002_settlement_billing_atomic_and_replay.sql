-- ============================================================================
-- 20261009000002_settlement_billing_atomic_and_replay.sql   (safe to re-run)
--
-- Makes a bill settlement one transaction, end to end. Apply in the Supabase
-- SQL editor AFTER 20261009000001 (it depends on wallet_redemptions.applied_amount).
--
--   1. p_billing: the billing fields (tender, line items, subtotal, tax, discount)
--      are written inside the settlement. They used to be written by a separate
--      statement first, so a settlement rejected afterwards left the order's
--      items and discount changed while the order stayed open.
--   2. Replay: the same order settling again after its own redemption code was
--      applied (double tap, network retry) succeeds without debiting twice. It
--      used to fail with REDEMPTION_ALREADY_USED although the bill had settled.
--   3. The function is replaced under a new signature (12 arguments). The old
--      11-argument version is dropped so PostgREST has exactly one candidate.
--
-- Nothing else changes: cashback is still once per order, the wallet debit is
-- still exactly the discount applied, and every failure rolls everything back.
-- ============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.execute_atomic_bill_settlement(text, text, text, uuid, numeric, numeric, numeric, text, text, text, text);

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
    v_redemption_rec record;
    v_redemption_replay boolean := false;
    v_target_guest_id text;
    v_business_text text := p_business_id::text;
    v_order_uuid uuid;
    v_caller_role text;
    v_caller_uid uuid;
    v_is_authorized boolean := false;
    v_items_type text;
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

    IF p_order_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        v_order_uuid := p_order_id::uuid;
    END IF;

    -- ── Cross-resource integrity (unchanged) ──
    IF v_order_uuid IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.orders
            WHERE id = v_order_uuid
              AND business_id = p_business_id
              AND (p_table_number IS NULL OR table_number ILIKE '%' || p_table_number || '%')
        ) THEN
            RAISE EXCEPTION 'IDOR_RESOURCE_MISMATCH: Order % does not belong to business % or table %', p_order_id, p_business_id, p_table_number;
        END IF;
    END IF;

    IF p_session_id IS NOT NULL AND p_session_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.dine_in_sessions
            WHERE id = p_session_id::uuid AND business_id = p_business_id
        ) THEN
            RAISE EXCEPTION 'IDOR_RESOURCE_MISMATCH: Session % does not belong to business %', p_session_id, p_business_id;
        END IF;
    END IF;

    -- Only a real guest identity earns cashback / can redeem. No synthetic
    -- 'table_<n>' wallets: nobody can ever see or spend those.
    v_target_guest_id := NULLIF(btrim(COALESCE(p_guest_handle, p_guest_id, '')), '');

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

    -- ── Wallet redemption ──
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
            -- Replay: this same order already settled with this code. Nothing is debited again.
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

            -- The debit is the discount the bill actually received from this code.
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

            -- The wallet the code was issued against. Missing row = failure, never a silent skip.
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

    -- ── 7% cashback on the bill before tax, after discount; once per order (unchanged) ──
    v_cashback_base := GREATEST(0, COALESCE(NULLIF(p_subtotal, 0), p_grand_total, 0) - COALESCE(p_discount_amount, 0));
    v_cashback_amt := round(v_cashback_base * 0.07, 2);

    IF v_target_guest_id IS NOT NULL AND v_cashback_amt > 0
       AND NOT (v_order_uuid IS NOT NULL AND EXISTS (
           SELECT 1 FROM public.wallet_transactions
           WHERE order_id = v_order_uuid AND transaction_type = 'CASHBACK'
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

    -- ── Order / session / table state (unchanged) ──
    IF p_session_id IS NOT NULL AND p_session_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        UPDATE public.dine_in_sessions
        SET status = 'closed', updated_at = now()
        WHERE id = p_session_id::uuid;
    END IF;

    IF v_order_uuid IS NOT NULL THEN
        UPDATE public.orders
        SET status = 'settled',
            grand_total = p_grand_total
        WHERE id = v_order_uuid;
    END IF;

    IF p_table_number IS NOT NULL AND p_table_number <> '' THEN
        UPDATE public.restaurant_tables
        SET status = 'VACANT'
        WHERE business_id = p_business_id
          AND upper(table_number) = upper(p_table_number);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'cashback_credited', v_cashback_amt,
        'redeemed_amount', v_redeem_amt,
        'redemption_replayed', v_redemption_replay,
        'guest_id', v_target_guest_id,
        'table_number', p_table_number
    );
END;
$$;

DO $$ BEGIN
    REVOKE EXECUTE ON FUNCTION public.execute_atomic_bill_settlement(text, text, text, uuid, numeric, numeric, numeric, text, text, text, text, jsonb) FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.execute_atomic_bill_settlement(text, text, text, uuid, numeric, numeric, numeric, text, text, text, text, jsonb) TO authenticated, service_role;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

COMMIT;
