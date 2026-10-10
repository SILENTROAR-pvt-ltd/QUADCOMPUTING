-- ============================================================
-- MIGRATION: Host Venue Subscriptions & Credit Wallet Ecosystem
-- ============================================================

-- 1. VENUE SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.venue_subscriptions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    venue_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    plan_tier text NOT NULL CHECK (plan_tier IN ('8k_2m', '12k_6m', '14k_9m', 'pay_as_you_go')) DEFAULT 'pay_as_you_go',
    status text NOT NULL CHECK (status IN ('trial', 'active', 'expired')) DEFAULT 'trial',
    trial_ends_at timestamp with time zone DEFAULT (now() + interval '60 days'),
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT venue_subscriptions_pkey PRIMARY KEY (id),
    CONSTRAINT venue_subscriptions_venue_id_key UNIQUE (venue_id)
);

CREATE INDEX IF NOT EXISTS idx_venue_subscriptions_venue ON public.venue_subscriptions(venue_id);

-- 2. VENUE WALLETS TABLE
CREATE TABLE IF NOT EXISTS public.venue_wallets (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    venue_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    balance numeric NOT NULL DEFAULT 0.00,
    currency text NOT NULL DEFAULT 'INR',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT venue_wallets_pkey PRIMARY KEY (id),
    CONSTRAINT venue_wallets_venue_id_key UNIQUE (venue_id)
);

CREATE INDEX IF NOT EXISTS idx_venue_wallets_venue ON public.venue_wallets(venue_id);

-- 3. USAGE LEDGER TABLE
CREATE TABLE IF NOT EXISTS public.usage_ledger (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    venue_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    action_type text NOT NULL,
    cost numeric NOT NULL DEFAULT 0.00,
    reference_id text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT usage_ledger_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_usage_ledger_venue ON public.usage_ledger(venue_id, created_at DESC);

-- 4. ATOMIC CREDIT DEDUCTION RPC FUNCTION
CREATE OR REPLACE FUNCTION deduct_venue_wallet_credits(
    p_venue_id uuid,
    p_amount numeric,
    p_action_type text,
    p_reference_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance numeric;
    v_new_balance numeric;
BEGIN
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
        updated_at = timezone('utc'::text, now())
    WHERE venue_id = p_venue_id;

    INSERT INTO public.usage_ledger (venue_id, action_type, cost, reference_id)
    VALUES (p_venue_id, p_action_type, p_amount, p_reference_id);

    RETURN jsonb_build_object(
        'success', true,
        'deducted', p_amount,
        'new_balance', v_new_balance
    );
END;
$$;

-- 5. RLS POLICIES
ALTER TABLE public.venue_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select venue_subscriptions" ON public.venue_subscriptions;
CREATE POLICY "Public select venue_subscriptions" ON public.venue_subscriptions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public insert venue_subscriptions" ON public.venue_subscriptions;
CREATE POLICY "Public insert venue_subscriptions" ON public.venue_subscriptions FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public update venue_subscriptions" ON public.venue_subscriptions;
CREATE POLICY "Public update venue_subscriptions" ON public.venue_subscriptions FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public select venue_wallets" ON public.venue_wallets;
CREATE POLICY "Public select venue_wallets" ON public.venue_wallets FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public insert venue_wallets" ON public.venue_wallets;
CREATE POLICY "Public insert venue_wallets" ON public.venue_wallets FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public update venue_wallets" ON public.venue_wallets;
CREATE POLICY "Public update venue_wallets" ON public.venue_wallets FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public select usage_ledger" ON public.usage_ledger;
CREATE POLICY "Public select usage_ledger" ON public.usage_ledger FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public insert usage_ledger" ON public.usage_ledger;
CREATE POLICY "Public insert usage_ledger" ON public.usage_ledger FOR INSERT WITH CHECK (true);
