-- ============================================================================
-- 20261016000002_waiter_settle_switch.sql   (safe to re-run)
--
-- Whether waiters may settle a table's bill from Live Tables (choosing cash, UPI or card
-- and freeing the table), or may only send the bill to billing for the cashier.
-- The owner sets it in My profile. It starts OFF: until the owner turns it on, a waiter
-- can only "Send to billing". Nothing is dropped.
-- Apply in the Supabase SQL editor.
-- ============================================================================

BEGIN;

ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS waiter_can_settle boolean NOT NULL DEFAULT false;

COMMIT;
