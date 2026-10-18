-- ============================================================================
-- apply-pending-20261018.sql  - run ONCE in the Supabase SQL editor (project: Quad Computing, main).
-- It is the two pre-launch audit migrations below, in order. Each is safe to re-run.
--   1. daily order numbers (ORD-001 ... per venue per billing day, existing orders numbered too)
--   2. lock down businesses / locations / profiles (drops every open policy, recreates the owner-only ones)
-- Run it with the 'Role: postgres' default. Step 2 prints a NOTICE for every policy it drops.
-- Afterwards run the check at the very end (it lists the policies that remain and the first order numbers).
-- ============================================================================
-- ###################### 20261018000001_daily_order_numbers.sql ######################
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

-- ###################### 20261018000002_lockdown_tenant_tables.sql ######################
-- ============================================================================
-- 20261018000002_lockdown_tenant_tables.sql   (safe to re-run)
--
-- The pre-launch audit found that a signed-out visitor with only the public anon key could read, change and delete a
-- venue row that has no owner (host_id null). Two earlier migrations are behind it:
--   * 20260929000002 added "Allow host control center ..." policies on businesses, locations and profiles for
--     anon AND authenticated with USING (true) / WITH CHECK (true), and
--   * 20261008000007 locked businesses down by dropping ONE policy by name, so every other policy stayed.
-- Policies are OR-ed together, so any one open policy opens the table, and the live database holds policies that the
-- migration files do not show.
--
-- This drops EVERY policy on the three tables, whatever its name, and recreates only the intended ones:
--   businesses : the owner (host_id) and signed-in staff of that venue read it; only the owner changes or deletes it.
--   locations  : the same, through the venue.
--   profiles   : each person reads and changes only their own row.
-- The app's server routes use the service role (which bypasses these policies) or the signed-in host's own session, so
-- nothing the app does for a real venue changes. Guests never touch these tables directly: they read the public menu
-- through the API and the sanitised view public.venues_public.
-- ============================================================================

BEGIN;

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname, tablename FROM pg_policies
            WHERE schemaname = 'public' AND tablename IN ('businesses', 'locations', 'profiles') LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
    RAISE NOTICE 'dropped policy "%" on %', p.policyname, p.tablename;
  END LOOP;
END $$;

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles   ENABLE ROW LEVEL SECURITY;

-- The anon role needs no direct access to any of the three (the public menu is served by the API).
REVOKE ALL ON public.businesses, public.locations, public.profiles FROM anon;

-- businesses
CREATE POLICY "Owner and staff read their venue" ON public.businesses FOR SELECT TO authenticated
  USING (auth.uid() = host_id OR id = ANY (public.get_auth_business_ids()));
CREATE POLICY "Owner creates their venue" ON public.businesses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Owner updates their venue" ON public.businesses FOR UPDATE TO authenticated
  USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Owner deletes their venue" ON public.businesses FOR DELETE TO authenticated
  USING (auth.uid() = host_id);

-- locations (a venue's branches)
CREATE POLICY "Owner and staff read their locations" ON public.locations FOR SELECT TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE host_id = auth.uid()) OR business_id = ANY (public.get_auth_business_ids()));
CREATE POLICY "Owner creates their locations" ON public.locations FOR INSERT TO authenticated
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE host_id = auth.uid()));
CREATE POLICY "Owner updates their locations" ON public.locations FOR UPDATE TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE host_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE host_id = auth.uid()));
CREATE POLICY "Owner deletes their locations" ON public.locations FOR DELETE TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE host_id = auth.uid()));

-- profiles
CREATE POLICY "People read their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "People create their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "People update their own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "People delete their own profile" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- The sanitised public view keeps working for the public menu directory (it runs with its owner's rights).
DO $$ BEGIN
  IF to_regclass('public.venues_public') IS NOT NULL THEN
    EXECUTE 'GRANT SELECT ON public.venues_public TO anon, authenticated';
  END IF;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';


-- ###################### CHECK (read-only) ######################
SELECT tablename, policyname, cmd, roles FROM pg_policies
 WHERE schemaname = 'public' AND tablename IN ('businesses', 'locations', 'profiles') ORDER BY tablename, cmd, policyname;
SELECT business_id, order_day, order_number, created_at FROM public.orders WHERE order_number IS NOT NULL ORDER BY created_at DESC LIMIT 10;