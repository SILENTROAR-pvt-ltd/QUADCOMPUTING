-- ============================================================================
-- 20261008000004_schema_drift_fixes.sql   (safe to re-run)
--
-- The live schema had drifted from what the application writes. Each item below is a real
-- failure found by comparing the deployed schema with the code:
--
--  1. staff_notifications.notification_type only allowed WAITER/CHEF, so every "request bill"
--     insert failed; the low-balance alert also inserts a `message` column that did not exist
--     and no table_number (NOT NULL).
--  2. orders.payment_method only allowed UPI/CASH/CARD, so a SPLIT tender at room checkout was
--     rejected by the database.
--  3. venue_topup_requests had no unique constraint on utr_number, so the same payment
--     reference could be submitted (and credited) more than once.
--  4. usage_ledger lacked balance_after, which the wallet-deduction function writes.
--  5. The "one pending redemption per guest per venue" index was not present.
-- Constraints that would be violated by existing data are skipped with a NOTICE instead of failing.
-- ============================================================================

BEGIN;

-- 1. staff_notifications ------------------------------------------------------
ALTER TABLE public.staff_notifications ADD COLUMN IF NOT EXISTS message text;
ALTER TABLE public.staff_notifications ALTER COLUMN table_number DROP NOT NULL;

DO $$
DECLARE c record;
BEGIN
    FOR c IN
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'public.staff_notifications'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%notification_type%'
    LOOP
        EXECUTE format('ALTER TABLE public.staff_notifications DROP CONSTRAINT %I', c.conname);
    END LOOP;
END $$;

ALTER TABLE public.staff_notifications
    ADD CONSTRAINT staff_notifications_type_check
    CHECK (notification_type = ANY (ARRAY['WAITER', 'CHEF', 'BILL', 'SERVICE', 'WALLET_SUSPENDED_LOW_BALANCE']));

-- 2. orders.payment_method ----------------------------------------------------
DO $$
DECLARE c record;
BEGIN
    FOR c IN
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'public.orders'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%payment_method%'
    LOOP
        EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT %I', c.conname);
    END LOOP;
END $$;

ALTER TABLE public.orders
    ADD CONSTRAINT orders_payment_method_check
    CHECK (payment_method IS NULL OR payment_method = ANY (ARRAY['UPI', 'CASH', 'CARD', 'SPLIT', 'WALLET']));

-- 3. one top-up request per payment reference ---------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.venue_topup_requests
        GROUP BY lower(btrim(utr_number)) HAVING count(*) > 1
    ) THEN
        RAISE NOTICE 'Duplicate utr_number values exist in venue_topup_requests; unique index NOT created. Resolve the duplicates, then re-run this migration.';
    ELSE
        CREATE UNIQUE INDEX IF NOT EXISTS uq_topup_utr ON public.venue_topup_requests (lower(btrim(utr_number)));
    END IF;
END $$;

-- 4. usage_ledger.balance_after -----------------------------------------------
ALTER TABLE public.usage_ledger ADD COLUMN IF NOT EXISTS balance_after numeric;

-- 5. one pending redemption per guest per venue -------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.wallet_redemptions
        WHERE status = 'pending'
        GROUP BY business_id, guest_id HAVING count(*) > 1
    ) THEN
        RAISE NOTICE 'Duplicate pending redemptions exist; uq_pending_redemption_per_guest NOT created. Cancel the extras, then re-run this migration.';
    ELSE
        CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_redemption_per_guest
            ON public.wallet_redemptions (business_id, guest_id) WHERE status = 'pending';
    END IF;
END $$;

COMMIT;
