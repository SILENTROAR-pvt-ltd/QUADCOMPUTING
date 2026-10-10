-- ============================================================================
-- 20261008000002_guest_wallet_claims.sql
--
-- Guest wallets are keyed by a plain string (handle, phone, ...). With no proof of ownership,
-- anyone who knew or guessed that string could read the wallet and mint a redemption code.
--
-- A claim binds an identifier to a random secret held only by the guest's browser. The first
-- request that presents an unclaimed identifier claims it (trust on first use); every later
-- request must present the same secret. Only the SHA-256 of the secret is stored.
--
-- Only the service role touches this table (API routes use adminDb()); RLS is enabled with no
-- policies, so anon/authenticated clients can neither read hashes nor insert claims.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.guest_wallet_claims (
    guest_key   TEXT PRIMARY KEY,
    secret_hash TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.guest_wallet_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.guest_wallet_claims FROM anon, authenticated;

-- A venue-scoped "pending" redemption older than its expiry still blocks the
-- (business_id, guest_id) partial unique index until it is flipped to 'expired'.
CREATE INDEX IF NOT EXISTS idx_wallet_redemptions_pending_expiry
    ON public.wallet_redemptions (expires_at)
    WHERE status = 'pending';

COMMIT;
