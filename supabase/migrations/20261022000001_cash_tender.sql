-- Cash accountability: what the guest handed over and what went back as change.
--
-- A ₹3,050 bill paid with ₹4,000 in notes is a ₹3,050 sale, but the drawer saw ₹4,000 come in and ₹950 go out. The
-- bill keeps both figures, so the receipt shows the change, the Z-report's drawer count reconciles cash received against
-- change returned, and the net cash sales still equal the bills. Null for every bill that is not cash, or where the
-- exact amount was given.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cash_tendered numeric(12,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cash_change   numeric(12,2);

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_cash_tender_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_cash_tender_check CHECK (
  (cash_tendered IS NULL AND cash_change IS NULL)
  OR (cash_tendered >= 0 AND cash_change >= 0 AND cash_change <= cash_tendered)
);

COMMENT ON COLUMN public.orders.cash_tendered IS 'Cash handed over by the guest for this bill (cash tenders only).';
COMMENT ON COLUMN public.orders.cash_change   IS 'Change returned to the guest from cash_tendered.';
