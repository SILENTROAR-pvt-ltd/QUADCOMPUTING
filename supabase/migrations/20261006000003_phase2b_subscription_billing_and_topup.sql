-- Migration: 20261006000003_phase2b_subscription_billing_and_topup.sql
-- Description: Phase 2B Subscription Billing, Top-up Approval RPC, and Idempotent Platform Fee Deductions

-- 1. Ensure venue_subscriptions constraint supports 'trial', 'trialing', 'active', 'expired', 'suspended'
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'venue_subscriptions_status_check'
    ) THEN
        ALTER TABLE public.venue_subscriptions DROP CONSTRAINT venue_subscriptions_status_check;
    END IF;

    ALTER TABLE public.venue_subscriptions 
      ADD CONSTRAINT venue_subscriptions_status_check 
      CHECK (status IN ('trial', 'trialing', 'active', 'expired', 'suspended'));

    -- Allow negative balance representation for overdraft / suspended operations
    ALTER TABLE IF EXISTS public.venue_wallets DROP CONSTRAINT IF EXISTS chk_bal;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 2. Atomic Top-Up Approval SQL RPC (service_role only)
-- Credits wallet balance atomically, activates requested plan tier if applicable, and updates request status
CREATE OR REPLACE FUNCTION public.approve_topup_request(
    p_request_id UUID,
    p_admin_id TEXT DEFAULT 'admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_req RECORD;
    v_new_balance NUMERIC;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_plan_updated BOOLEAN := false;
BEGIN
    IF p_request_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'REQUEST_ID_REQUIRED');
    END IF;

    -- Row-lock the top-up request
    SELECT * INTO v_req
    FROM public.venue_topup_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'TOPUP_REQUEST_NOT_FOUND');
    END IF;

    -- Idempotency check: if already approved, return success
    IF v_req.status = 'approved' THEN
        SELECT balance INTO v_new_balance FROM public.venue_wallets WHERE venue_id = v_req.venue_id;
        RETURN jsonb_build_object(
            'success', true,
            'idempotent', true,
            'message', 'Top-up request already approved',
            'new_balance', COALESCE(v_new_balance, 0)
        );
    END IF;

    IF v_req.status != 'pending' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVALID_STATUS',
            'current_status', v_req.status
        );
    END IF;

    -- Validate amount & UTR
    IF v_req.amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_AMOUNT');
    END IF;

    -- 1. Atomically credit wallet
    INSERT INTO public.venue_wallets (venue_id, balance, currency, updated_at)
    VALUES (v_req.venue_id, v_req.amount, 'INR', v_now)
    ON CONFLICT (venue_id) DO UPDATE
    SET balance = public.venue_wallets.balance + EXCLUDED.balance,
        updated_at = v_now
    RETURNING balance INTO v_new_balance;

    -- 2. Update subscription plan tier if requested
    IF v_req.requested_plan_tier IS NOT NULL AND v_req.requested_plan_tier != 'pay_as_you_go' THEN
        INSERT INTO public.venue_subscriptions (
            venue_id, plan_tier, status, expires_at, updated_at
        )
        VALUES (
            v_req.venue_id,
            v_req.requested_plan_tier,
            'active',
            v_now + CASE 
                WHEN v_req.requested_plan_tier = '8k_2m' THEN interval '60 days'
                WHEN v_req.requested_plan_tier = '12k_6m' THEN interval '180 days'
                WHEN v_req.requested_plan_tier = '14k_9m' THEN interval '270 days'
                ELSE interval '30 days'
            END,
            v_now
        )
        ON CONFLICT (venue_id) DO UPDATE
        SET plan_tier = EXCLUDED.plan_tier,
            status = 'active',
            expires_at = EXCLUDED.expires_at,
            updated_at = v_now;

        v_plan_updated := true;
    ELSE
        -- Ensure subscription is not suspended once positive balance exists
        UPDATE public.venue_subscriptions
        SET status = 'active',
            updated_at = v_now
        WHERE venue_id = v_req.venue_id AND status = 'suspended';
    END IF;

    -- 3. Update top-up request record
    UPDATE public.venue_topup_requests
    SET status = 'approved',
        reviewed_by = COALESCE(p_admin_id, 'admin'),
        reviewed_at = v_now,
        updated_at = v_now
    WHERE id = p_request_id;

    -- 4. Record audit ledger entry
    INSERT INTO public.usage_ledger (
        venue_id, action_type, cost, balance_after, reference_id, metadata, created_at
    ) VALUES (
        v_req.venue_id,
        'WALLET_TOPUP',
        v_req.amount,
        v_new_balance,
        'TOPUP_' || p_request_id::text,
        jsonb_build_object(
            'utr', v_req.utr_number,
            'payment_method', v_req.payment_method,
            'admin_id', p_admin_id
        ),
        v_now
    );

    RETURN jsonb_build_object(
        'success', true,
        'request_id', p_request_id,
        'venue_id', v_req.venue_id,
        'credited_amount', v_req.amount,
        'new_balance', v_new_balance,
        'plan_updated', v_plan_updated
    );
END;
$$;

-- Secure approve_topup_request: service_role ONLY
REVOKE ALL ON FUNCTION public.approve_topup_request(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_topup_request(UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.approve_topup_request(UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.approve_topup_request(UUID, TEXT) TO service_role;

-- 3. Idempotent Platform Fee Deduction RPC
-- Exactly once deduction per settled order / referenceId
CREATE OR REPLACE FUNCTION public.deduct_venue_wallet_credits(
    p_venue_id UUID,
    p_amount NUMERIC,
    p_action_type TEXT,
    p_reference_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_balance NUMERIC;
    v_new_balance NUMERIC;
    v_caller_role TEXT;
    v_caller_uid UUID;
    v_is_authorized BOOLEAN := false;
BEGIN
    SET LOCAL statement_timeout = '3000ms';
    SET LOCAL lock_timeout = '2000ms';

    -- Authorization check for authenticated client calls
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

    -- Strict Idempotency: Deduct exactly once per referenceId
    IF p_reference_id IS NOT NULL AND trim(p_reference_id) != '' THEN
        IF EXISTS (
            SELECT 1 FROM public.usage_ledger 
            WHERE venue_id = p_venue_id 
              AND action_type = p_action_type 
              AND reference_id = p_reference_id
        ) THEN
            SELECT balance INTO v_current_balance FROM public.venue_wallets WHERE venue_id = p_venue_id;
            RETURN jsonb_build_object(
                'success', true,
                'idempotent', true,
                'message', 'Fee already deducted for this reference',
                'deducted', 0,
                'remaining_balance', COALESCE(v_current_balance, 0)
            );
        END IF;
    END IF;

    -- Fetch and lock wallet
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
        venue_id, action_type, cost, balance_after, reference_id, created_at
    ) VALUES (
        p_venue_id, p_action_type, p_amount, v_new_balance, p_reference_id, timezone('utc'::text, now())
    );

    RETURN jsonb_build_object(
        'success', true,
        'deducted', p_amount,
        'remaining_balance', v_new_balance
    );
END;
$$;

REVOKE ALL ON FUNCTION public.deduct_venue_wallet_credits(UUID, NUMERIC, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.deduct_venue_wallet_credits(UUID, NUMERIC, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.deduct_venue_wallet_credits(UUID, NUMERIC, TEXT, TEXT) TO service_role, authenticated;
