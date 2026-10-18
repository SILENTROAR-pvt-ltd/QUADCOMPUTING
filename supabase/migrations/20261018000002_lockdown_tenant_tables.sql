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
