-- ============================================================
-- 20261004000002_rpc_security_idor_and_pgbouncer.sql
-- Production Hardening:
-- 1. RPC Authorization & IDOR Lockdown
-- 2. PgBouncer Transaction Mode Concurrency Safety
-- ============================================================

-- 1. Hardened execute_atomic_bill_settlement with IDOR checks & PgBouncer safeguards
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
    v_caller_role text;
    v_caller_uid uuid;
    v_is_authorized boolean := false;
BEGIN
    -- ── PgBouncer Transaction-Mode Safety: Strict Lock & Statement Timeouts ──
    SET LOCAL statement_timeout = '4000ms';
    SET LOCAL lock_timeout = '2500ms';

    -- ── Section 1: IDOR Ownership & Authorization Verification ──
    v_caller_role := current_setting('request.jwt.claim.role', true);
    
    -- If called via Supabase client with JWT:
    IF v_caller_role = 'authenticated' THEN
        BEGIN
            v_caller_uid := auth.uid();
        EXCEPTION WHEN OTHERS THEN
            v_caller_uid := NULL;
        END;

        IF v_caller_uid IS NOT NULL THEN
            -- Verify caller is either business owner OR verified staff member
            SELECT EXISTS (
                SELECT 1 FROM public.businesses 
                WHERE id = p_business_id AND host_id = v_caller_uid
            ) OR EXISTS (
                SELECT 1 FROM public.staff_members
                WHERE business_id = p_business_id AND auth_user_id = v_caller_uid
            ) INTO v_is_authorized;

            IF NOT v_is_authorized THEN
                RAISE EXCEPTION 'IDOR_ACCESS_DENIED: Caller % is not authorized for business %', v_caller_uid, p_business_id;
            END IF;
        END IF;
    END IF;

    -- ── Section 2: Strict Cross-Resource Integrity Verification ──
    -- Ensure order belongs to the business & table
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

    -- Ensure session belongs to the business & table
    IF p_session_id IS NOT NULL AND p_session_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.dine_in_sessions
            WHERE id = p_session_id::uuid 
              AND business_id = p_business_id
        ) THEN
            RAISE EXCEPTION 'IDOR_RESOURCE_MISMATCH: Session % does not belong to business %', p_session_id, p_business_id;
        END IF;
    END IF;

    v_target_guest_id := COALESCE(p_guest_handle, p_guest_id, 'table_' || p_table_number);

    -- ── Section 3: One-Time Redemption Execution (Single-Use Locked) ──
    IF p_redemption_code IS NOT NULL AND trim(p_redemption_code) <> '' THEN
        SELECT * INTO v_redemption_rec
        FROM public.wallet_redemptions
        WHERE code = upper(trim(p_redemption_code))
          AND (business_id = p_business_id OR cafe_id = p_business_id)
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'IDOR_RESOURCE_MISMATCH: Redemption code % not found for business %', p_redemption_code, p_business_id;
        END IF;

        IF v_redemption_rec.status = 'redeemed' THEN
            RAISE EXCEPTION 'REDEMPTION_ALREADY_USED: Code % was already redeemed at %', p_redemption_code, v_redemption_rec.redeemed_at;
        END IF;

        v_redeem_amt := v_redemption_rec.amount;

        UPDATE public.wallet_redemptions
        SET status = 'redeemed',
            redeemed_at = now()
        WHERE code = upper(trim(p_redemption_code));

        SELECT id, balance INTO v_wallet_id, v_current_balance
        FROM public.guest_wallets
        WHERE (guest_id = v_target_guest_id OR id = v_redemption_rec.wallet_id)
          AND (business_id = p_business_id OR cafe_id = p_business_id)
        FOR UPDATE;

        IF FOUND THEN
            UPDATE public.guest_wallets
            SET balance = GREATEST(0, balance - v_redeem_amt),
                updated_at = now()
            WHERE id = v_wallet_id;

            INSERT INTO public.wallet_transactions(
                wallet_id, guest_id, cafe_id, table_number, transaction_type,
                rate, amount, balance_before, balance_after, description
            ) VALUES (
                v_wallet_id, v_target_guest_id, p_business_id, p_table_number, 'REDEMPTION',
                '100%', v_redeem_amt, v_current_balance, GREATEST(0, v_current_balance - v_redeem_amt),
                'Redeemed ₹' || v_redeem_amt || ' with code ' || p_redemption_code
            );
        END IF;
    END IF;

    -- ── Section 4: Automated 7% Cashback Credit ──
    IF p_grand_total > 0 THEN
        v_cashback_amt := round(p_grand_total * 0.07, 2);

        SELECT id, balance INTO v_wallet_id, v_current_balance
        FROM public.guest_wallets
        WHERE guest_id = v_target_guest_id
          AND (business_id = p_business_id OR cafe_id = p_business_id)
        FOR UPDATE;

        IF NOT FOUND THEN
            INSERT INTO public.guest_wallets(
                guest_id, business_id, cafe_id, guest_handle, balance, total_cashback_earned
            ) VALUES (
                v_target_guest_id, p_business_id, p_business_id, p_guest_handle, v_cashback_amt, v_cashback_amt
            ) RETURNING id, balance INTO v_wallet_id, v_current_balance;
        ELSE
            UPDATE public.guest_wallets
            SET balance = balance + v_cashback_amt,
                total_cashback_earned = total_cashback_earned + v_cashback_amt,
                updated_at = now()
            WHERE id = v_wallet_id;
        END IF;

        INSERT INTO public.wallet_transactions(
            wallet_id, guest_id, cafe_id, table_number, transaction_type,
            rate, amount, balance_before, balance_after, description
        ) VALUES (
            v_wallet_id, v_target_guest_id, p_business_id, p_table_number, 'CASHBACK',
            '7%', v_cashback_amt, v_current_balance, v_current_balance + v_cashback_amt,
            '7% Cashback on Table ' || p_table_number
        );
    END IF;

    -- ── Section 5: Order, Session & Table State Synchronization ──
    IF p_session_id IS NOT NULL AND p_session_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        UPDATE public.dine_in_sessions
        SET status = 'settled',
            ended_at = now()
        WHERE id = p_session_id::uuid;
    END IF;

    IF p_order_id IS NOT NULL AND p_order_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        UPDATE public.orders
        SET status = 'completed',
            payment_status = 'settled',
            grand_total = p_grand_total
        WHERE id = p_order_id::uuid;
    END IF;

    IF p_table_number IS NOT NULL AND p_table_number <> '' THEN
        UPDATE public.restaurant_tables
        SET status = 'vacant',
            active_session_id = NULL
        WHERE business_id = p_business_id
          AND upper(table_number) = upper(p_table_number);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'cashback_credited', v_cashback_amt,
        'redeemed_amount', v_redeem_amt,
        'table_number', p_table_number
    );
END;
$$;

-- Grant permissions for execute_atomic_bill_settlement after creation
DO $$
BEGIN
    REVOKE EXECUTE ON FUNCTION public.execute_atomic_bill_settlement(text, text, text, uuid, numeric, numeric, numeric, text, text, text, text) FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.execute_atomic_bill_settlement(text, text, text, uuid, numeric, numeric, numeric, text, text, text, text) TO authenticated, service_role;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 2. Also secure deduct_venue_wallet_credits against IDOR & PgBouncer starvation
CREATE OR REPLACE FUNCTION public.deduct_venue_wallet_credits(
    p_venue_id uuid,
    p_amount numeric,
    p_action_type text,
    p_reference_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_balance numeric;
    v_new_balance numeric;
    v_caller_role text;
    v_caller_uid uuid;
    v_is_authorized boolean := false;
BEGIN
    SET LOCAL statement_timeout = '3000ms';
    SET LOCAL lock_timeout = '2000ms';

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
                WHERE id = p_venue_id AND host_id = v_caller_uid
            ) INTO v_is_authorized;

            IF NOT v_is_authorized THEN
                RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED_VENUE_ACCESS');
            END IF;
        END IF;
    END IF;

    SELECT balance INTO v_current_balance
    FROM public.venue_wallets
    WHERE venue_id = p_venue_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'WALLET_NOT_FOUND');
    END IF;

    IF v_current_balance < p_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INSUFFICIENT_FUNDS',
            'current_balance', v_current_balance,
            'required_amount', p_amount
        );
    END IF;

    v_new_balance := v_current_balance - p_amount;

    UPDATE public.venue_wallets
    SET balance = v_new_balance,
        updated_at = now()
    WHERE venue_id = p_venue_id;

    INSERT INTO public.usage_ledger(
        venue_id, action_type, cost, balance_after, reference_id
    ) VALUES (
        p_venue_id, p_action_type, p_amount, v_new_balance, p_reference_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'deducted', p_amount,
        'remaining_balance', v_new_balance
    );
END;
$$;

-- Grant permissions for deduct_venue_wallet_credits after creation
DO $$
BEGIN
    REVOKE EXECUTE ON FUNCTION public.deduct_venue_wallet_credits(uuid, numeric, text, text) FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.deduct_venue_wallet_credits(uuid, numeric, text, text) TO authenticated, service_role;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
