-- ============================================================================
-- 20261018000001_daily_order_numbers.sql   (safe to re-run)
--
-- Every order gets a clean number for its billing day: ORD-001, ORD-002 ... per venue, restarting each day.
--
--   * The billing day is the one the dues slips use: the IST date, or the next date once it is 10 PM or later
--     (lib/services/wallet/billing-day.ts), so an order at 10:30 PM counts for tomorrow's slip and its number.
--   * The number is given by a trigger, so every way an order is created (guest QR order, delivery, till, waiter) is
--     numbered without changing any of them.
--   * The trigger runs at COMMIT (a deferred constraint trigger), so the venue's counter row is locked for a moment, not
--     for the whole order: orders at different tables never wait on each other, and a rolled-back order leaves no gap.
--   * Orders that already exist are numbered in the order they were placed.
--   * Additive only: nothing is dropped or rewritten except the three new columns' values.
-- ============================================================================

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_day    date;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_seq    integer;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number text;

-- One row per venue per billing day: the last number given. Reached only by the trigger below (and the service role).
CREATE TABLE IF NOT EXISTS public.venue_order_counters (
  business_id uuid    NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  day         date    NOT NULL,
  last_seq    integer NOT NULL DEFAULT 0,
  PRIMARY KEY (business_id, day)
);
ALTER TABLE public.venue_order_counters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.venue_order_counters FROM anon, authenticated;

-- The billing day of a moment: its IST date, or the next date from 10 PM.
CREATE OR REPLACE FUNCTION public.billing_day_of(p_at timestamptz) RETURNS date
LANGUAGE sql STABLE AS $$
  SELECT ((p_at AT TIME ZONE 'Asia/Kolkata') + interval '2 hours')::date;
$$;

-- Gives one order its number if it has none. Returns the number it holds.
CREATE OR REPLACE FUNCTION public.assign_order_number() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_day date;
  v_seq integer;
BEGIN
  SELECT public.billing_day_of(COALESCE(o.created_at, now())) INTO v_day
    FROM public.orders o WHERE o.id = NEW.id AND o.order_number IS NULL AND o.business_id IS NOT NULL;
  IF v_day IS NULL THEN RETURN NULL; END IF;          -- already numbered, gone, or no venue

  INSERT INTO public.venue_order_counters AS c (business_id, day, last_seq)
  VALUES (NEW.business_id, v_day, 1)
  ON CONFLICT (business_id, day) DO UPDATE SET last_seq = c.last_seq + 1
  RETURNING c.last_seq INTO v_seq;

  UPDATE public.orders
     SET order_day = v_day, order_seq = v_seq, order_number = 'ORD-' || lpad(v_seq::text, 3, '0')
   WHERE id = NEW.id AND order_number IS NULL;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_order_number ON public.orders;
CREATE CONSTRAINT TRIGGER trg_assign_order_number
  AFTER INSERT ON public.orders
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.assign_order_number();

-- Number the orders that exist already, oldest first within each venue and billing day.
WITH ranked AS (
  SELECT id, business_id, public.billing_day_of(created_at) AS d,
         row_number() OVER (PARTITION BY business_id, public.billing_day_of(created_at) ORDER BY created_at, id) AS n
    FROM public.orders
   WHERE order_number IS NULL AND business_id IS NOT NULL AND created_at IS NOT NULL
)
UPDATE public.orders o
   SET order_day = r.d, order_seq = r.n, order_number = 'ORD-' || lpad(r.n::text, 3, '0')
  FROM ranked r
 WHERE o.id = r.id;

-- The counters pick up from the highest number given, per venue and day.
INSERT INTO public.venue_order_counters AS c (business_id, day, last_seq)
SELECT business_id, order_day, max(order_seq)
  FROM public.orders
 WHERE order_seq IS NOT NULL AND order_day IS NOT NULL
 GROUP BY business_id, order_day
ON CONFLICT (business_id, day) DO UPDATE SET last_seq = GREATEST(c.last_seq, EXCLUDED.last_seq);

-- A number is never given twice at one venue on one day.
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_venue_day_seq
  ON public.orders (business_id, order_day, order_seq) WHERE order_seq IS NOT NULL;

NOTIFY pgrst, 'reload schema';
