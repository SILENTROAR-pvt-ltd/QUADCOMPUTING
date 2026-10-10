-- ============================================================================
-- 20261007000001_fix_settlement_rpc_schema_mismatch.sql
--
-- execute_atomic_bill_settlement (20261004000002) does not match the live
-- schema and therefore aborted on every settlement, which is why guests saw
-- "bill settled" but their wallet stayed at zero with no wallet_transactions
-- row ever written:
--
--   1. It inserted into guest_wallets(..., guest_handle, ...) — guest_wallets
--      has no guest_handle column.
--   2. It compared `cafe_id = p_business_id` (and the same in
--      wallet_redemptions) where cafe_id/business_id are TEXT and
--      p_business_id is UUID. Postgres has no text = uuid operator, so the
--      lookup raised instead of matching.
--
-- This redefines the function against the real column types. Behaviour is
-- otherwise identical: row-locked redemption, 7% cashback credit, and
-- order/session/table state sync, all in one transaction.
-- ============================================================================

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
    p_guest_handle text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_wallet_id uuid;
    v_current_balance numeric := 0;
    v_redeem_amt numeric := 0;
    v_cashback_amt numeric := 0;
    v_redemption_rec record;
    v_target_guest_id text;
    v_business_text text := p_business_id::text;
    v_caller_role text;
    v_caller_uid uuid;
    v_is_authorized boolean := false;
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

    -- ── Cross-resource integrity ──
    IF p_order_id IS NOT NULL AND p_order_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.orders
            WHERE id = p_order_id::uuid
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

    v_target_guest_id := COALESCE(p_guest_handle, p_guest_id, 'table_' || p_table_number);

    -- ── One-time redemption (text columns compared against text) ──
    IF p_redemption_code IS NOT NULL AND trim(p_redemption_code) <> '' THEN
        SELECT * INTO v_redemption_rec
        FROM public.wallet_redemptions
        WHERE code = upper(trim(p_redemption_code))
          AND (business_id = v_business_text OR cafe_id = v_business_text)
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'IDOR_RESOURCE_MISMATCH: Redemption code % not found for business %', p_redemption_code, p_business_id;
        END IF;

        IF v_redemption_rec.status = 'redeemed' THEN
            RAISE EXCEPTION 'REDEMPTION_ALREADY_USED: Code % was already redeemed at %', p_redemption_code, v_redemption_rec.redeemed_at;
        END IF;

        v_redeem_amt := v_redemption_rec.amount;

        UPDATE public.wallet_redemptions
        SET status = 'redeemed', redeemed_at = now()
        WHERE code = upper(trim(p_redemption_code));

        SELECT id, balance INTO v_wallet_id, v_current_balance
        FROM public.guest_wallets
        WHERE (guest_id = v_target_guest_id OR id = v_redemption_rec.wallet_id)
          AND (business_id = p_business_id OR cafe_id = v_business_text)
        FOR UPDATE;

        IF FOUND THEN
            UPDATE public.guest_wallets
            SET balance = GREATEST(0, balance - v_redeem_amt),
                updated_at = now()
            WHERE id = v_wallet_id;

            INSERT INTO public.wallet_transactions(
                wallet_id, guest_id, business_id, cafe_id, table_number, transaction_type,
                rate, amount, balance_before, balance_after, description
            ) VALUES (
                v_wallet_id, v_target_guest_id, p_business_id, v_business_text, p_table_number, 'REDEMPTION',
                '100%', v_redeem_amt, v_current_balance, GREATEST(0, v_current_balance - v_redeem_amt),
                'Redeemed ₹' || v_redeem_amt || ' with code ' || p_redemption_code
            );
        END IF;
    END IF;

    -- ── 7% cashback credit ──
    IF p_grand_total > 0 THEN
        v_cashback_amt := round(p_grand_total * 0.07, 2);

        SELECT id, balance INTO v_wallet_id, v_current_balance
        FROM public.guest_wallets
        WHERE guest_id = v_target_guest_id
          AND (business_id = p_business_id OR cafe_id = v_business_text)
        FOR UPDATE;

        IF NOT FOUND THEN
            -- guest_wallets has no guest_handle column; the handle IS the
            -- guest_id we key the wallet on.
            INSERT INTO public.guest_wallets(
                guest_id, business_id, cafe_id, balance, total_cashback_earned
            ) VALUES (
                v_target_guest_id, p_business_id, v_business_text, v_cashback_amt, v_cashback_amt
            ) RETURNING id, 0::numeric INTO v_wallet_id, v_current_balance;
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
            v_wallet_id, v_target_guest_id, p_business_id, v_business_text, p_table_number,
            CASE WHEN p_order_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                 THEN p_order_id::uuid ELSE NULL END,
            'CASHBACK',
            '7%', v_cashback_amt, v_current_balance, v_current_balance + v_cashback_amt,
            '7% Cashback on Table ' || COALESCE(p_table_number, '')
        );
    END IF;

    -- ── Order / session / table state ──
    IF p_session_id IS NOT NULL AND p_session_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        UPDATE public.dine_in_sessions
        SET status = 'closed', updated_at = now()
        WHERE id = p_session_id::uuid;
    END IF;

    IF p_order_id IS NOT NULL AND p_order_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        UPDATE public.orders
        SET status = 'settled',
            grand_total = p_grand_total
        WHERE id = p_order_id::uuid;
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
        'guest_id', v_target_guest_id,
        'table_number', p_table_number
    );
END;
$$;

DO $$ BEGIN
    REVOKE EXECUTE ON FUNCTION public.execute_atomic_bill_settlement(text, text, text, uuid, numeric, numeric, numeric, text, text, text, text) FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.execute_atomic_bill_settlement(text, text, text, uuid, numeric, numeric, numeric, text, text, text, text) TO authenticated, service_role;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
