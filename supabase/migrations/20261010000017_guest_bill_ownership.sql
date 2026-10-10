-- Guest bill privacy: one guest could see another guest's settled bills.
--
-- Cause: a guest's invoices were matched through dine_in_sessions.guest_handle, and that handle
-- was overwritten by every later scan/order at the table, including on old sessions that were
-- never closed after settlement. The guest who scanned last "owned" every earlier party's bill.
--
-- This migration:
--   1. records each bill's owner on the bill itself (orders.guest_handle, stamped at settlement);
--   2. makes a session's guest_handle write-once, so a later scan or order cannot take it over;
--   3. closes sessions whose bills are all settled but which were left open;
--   4. backfills bill owners from cashback entries, which were written for that exact guest.
-- Idempotent: safe to run more than once.

-- 1. The guest a bill was settled to.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS guest_handle text;
CREATE INDEX IF NOT EXISTS idx_orders_guest_handle ON public.orders (guest_handle) WHERE guest_handle IS NOT NULL;

-- 2. A session's guest is set once, by the guest who opened the table.
CREATE OR REPLACE FUNCTION public.keep_session_guest_handle()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.guest_handle IS NOT NULL AND btrim(OLD.guest_handle) <> '' THEN
    NEW.guest_handle := OLD.guest_handle;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_keep_session_guest_handle ON public.dine_in_sessions;
CREATE TRIGGER trg_keep_session_guest_handle
  BEFORE UPDATE OF guest_handle ON public.dine_in_sessions
  FOR EACH ROW EXECUTE FUNCTION public.keep_session_guest_handle();

-- 3. Close sessions that hold a settled bill and nothing still open.
UPDATE public.dine_in_sessions s
SET status = 'closed', updated_at = now()
WHERE s.status IN ('open', 'bill_requested')
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.session_id = s.id
      AND o.status IN ('settled', 'SETTLED', 'completed', 'COMPLETED', 'paid', 'PAID')
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.session_id = s.id
      AND o.status NOT IN ('settled', 'SETTLED', 'completed', 'COMPLETED', 'paid', 'PAID', 'cancelled', 'CANCELLED')
  );

-- 4. Bills that earned a guest cashback belong to that guest.
UPDATE public.orders o
SET guest_handle = lower(w.guest_id)
FROM public.wallet_transactions t
JOIN public.guest_wallets w ON w.id = t.wallet_id
WHERE t.order_id::text = o.id::text
  AND t.transaction_type = 'CASHBACK'
  AND w.guest_id LIKE '@%'
  AND o.guest_handle IS NULL;
