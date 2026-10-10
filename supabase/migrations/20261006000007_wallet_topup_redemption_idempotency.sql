-- ============================================================================
-- 20261006000007_wallet_topup_redemption_idempotency.sql
--
-- Database-backed idempotency for wallet mutations (Phase 3 hardening):
--
-- 1. wallet_redemptions: a guest could get two "pending" redemption codes for
--    the same venue if two requests landed on different serverless instances
--    at the same time — the only guard against this was an in-memory Map
--    (lib/services/wallet/redemption-store.util.ts), which does not coordinate
--    across instances. A partial unique index makes "one pending redemption
--    per guest per venue" a real DB-enforced invariant.
--
-- 2. wallet_transactions.idempotency_key already had a computed DEFAULT
--    (20261005000003) but nothing enforced its uniqueness, so the column
--    existed without actually preventing a duplicate ledger row.
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_redemption_per_guest
ON public.wallet_redemptions (business_id, guest_id)
WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_transactions_idempotency_key
ON public.wallet_transactions (wallet_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;
