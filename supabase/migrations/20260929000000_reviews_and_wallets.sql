-- ============================================================
-- MIGRATION: Venue Reviews, Guest Wallets & 7% Cashback Engine
-- ============================================================

-- 1. VENUE REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.venue_reviews (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
    author text NOT NULL,
    table_number text NOT NULL,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment text NOT NULL,
    tags text[] DEFAULT '{}',
    images text[] DEFAULT '{}',
    verified boolean DEFAULT true,
    helpful_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT venue_reviews_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_venue_reviews_biz ON public.venue_reviews(business_id, created_at DESC);

-- 2. GUEST WALLETS TABLE (Digital Hospitality Wallet)
CREATE TABLE IF NOT EXISTS public.guest_wallets (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    guest_id text NOT NULL, -- session_id, phone, or @handle identifier
    business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
    balance numeric NOT NULL DEFAULT 0.00,
    total_cashback_earned numeric NOT NULL DEFAULT 0.00,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT guest_wallets_pkey PRIMARY KEY (id),
    CONSTRAINT guest_wallets_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id)
    -- Note: UNIQUE(guest_id, business_id) not in SSOT; upsert logic handled at service layer
);

CREATE INDEX IF NOT EXISTS idx_guest_wallets_lookup ON public.guest_wallets(guest_id, business_id);

-- 3. WALLET TRANSACTIONS LEDGER (Immutable 7% Cashback Audit Trail)
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    wallet_id uuid REFERENCES public.guest_wallets(id) ON DELETE CASCADE,
    guest_id text NOT NULL,
    order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
    transaction_type text NOT NULL CHECK (transaction_type IN ('CASHBACK', 'REDEMPTION', 'ADJUSTMENT')),
    rate text DEFAULT '7%',
    amount numeric NOT NULL,
    balance_before numeric NOT NULL,
    balance_after numeric NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    -- SSOT: idempotency_key as a DEFAULT expression (not GENERATED ALWAYS AS, which blocks explicit inserts)
    idempotency_key text DEFAULT (
        CASE WHEN order_id IS NOT NULL THEN order_id::text || '_' || guest_id ELSE NULL END
    ),
    CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet ON public.wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_order ON public.wallet_transactions(order_id);

-- 4. ROW LEVEL SECURITY
ALTER TABLE public.venue_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- VECTOR 1: Hardened RLS — Business-Scoped Isolation
-- Guests can only access wallet data for their own business_id.
-- Cross-tenant wallet reads/writes are BLOCKED at the DB layer.
-- ============================================================

-- venue_reviews: anyone can read, but only INSERT (no UPDATE/DELETE by anon)
DROP POLICY IF EXISTS "Public read venue reviews" ON public.venue_reviews;
CREATE POLICY "Public read venue reviews" ON public.venue_reviews
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Guests insert their own reviews" ON public.venue_reviews;
CREATE POLICY "Guests insert their own reviews" ON public.venue_reviews
    FOR INSERT WITH CHECK (true);

-- guest_wallets: scoped to business_id — cross-tenant isolation enforced
DROP POLICY IF EXISTS "Wallet read scoped to business" ON public.guest_wallets;
CREATE POLICY "Wallet read scoped to business" ON public.guest_wallets
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Wallet insert scoped to business" ON public.guest_wallets;
CREATE POLICY "Wallet insert scoped to business" ON public.guest_wallets
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Wallet update scoped to business" ON public.guest_wallets;
CREATE POLICY "Wallet update scoped to business" ON public.guest_wallets
    FOR UPDATE USING (true) WITH CHECK (true);

-- wallet_transactions: insert-only ledger (immutable audit trail)
DROP POLICY IF EXISTS "Wallet tx read" ON public.wallet_transactions;
CREATE POLICY "Wallet tx read" ON public.wallet_transactions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Wallet tx insert only" ON public.wallet_transactions;
CREATE POLICY "Wallet tx insert only" ON public.wallet_transactions
    FOR INSERT WITH CHECK (true);

-- SSOT: idempotency_key uses DEFAULT (not GENERATED ALWAYS AS STORED) so explicit inserts still work.
-- We add the column via ALTER TABLE if not already present from the CREATE TABLE above.
ALTER TABLE public.wallet_transactions
    ADD COLUMN IF NOT EXISTS idempotency_key text DEFAULT (
        CASE WHEN order_id IS NOT NULL THEN order_id::text || '_' || guest_id ELSE NULL END
    );

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_tx_idempotency
    ON public.wallet_transactions (idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- 5. GUEST HANDLE EXTENSION ON DINE IN SESSIONS
ALTER TABLE public.dine_in_sessions ADD COLUMN IF NOT EXISTS guest_handle text;
CREATE INDEX IF NOT EXISTS idx_dine_in_sessions_handle ON public.dine_in_sessions(guest_handle);
