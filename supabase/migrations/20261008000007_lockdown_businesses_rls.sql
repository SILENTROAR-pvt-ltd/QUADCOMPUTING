-- ============================================================================
-- 20261008000007_lockdown_businesses_rls.sql
--
-- Security & Financial Lockdown:
-- 1. Drops the open "Allow public read of businesses" policy on public.businesses
--    which previously exposed plaintext admin_pin, staff_pin, and banking details
--    to unauthenticated anon PostgREST clients.
-- 2. Restores strict RLS on public.businesses so only authenticated hosts and
--    authorized staff (via get_auth_business_ids()) can SELECT/UPDATE businesses.
-- 3. Creates a sanitized public view public.venues_public exposing only safe
--    public catalog metadata (id, name, business_name, slug, categories)
--    for anonymous menu discovery without leaking operational secrets.
-- 4. Locks down financial tables (venue_wallets, venue_subscriptions, 
--    venue_topup_requests, venue_outstanding_bills) by revoking direct public/anon
--    mutations and restricting SELECT to authenticated venue owners.
-- ============================================================================

BEGIN;

-- ── 1. Businesses Table Security Lockdown ─────────────────────────────────────

-- Drop the dangerous open read policy
DROP POLICY IF EXISTS "Allow public read of businesses" ON public.businesses;

-- Ensure RLS is active
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Host and Authorized Staff RLS Policy
DROP POLICY IF EXISTS "Users can view their own businesses." ON public.businesses;
CREATE POLICY "Users can view their own businesses."
ON public.businesses FOR SELECT
USING (
    auth.uid() = host_id 
    OR id = ANY(public.get_auth_business_ids())
);

DROP POLICY IF EXISTS "Hosts can update their own businesses." ON public.businesses;
CREATE POLICY "Hosts can update their own businesses."
ON public.businesses FOR UPDATE
USING (auth.uid() = host_id)
WITH CHECK (auth.uid() = host_id);

-- Sanitized public view for safe anonymous metadata
CREATE OR REPLACE VIEW public.venues_public AS
SELECT 
    id, 
    name, 
    business_name, 
    slug, 
    categories, 
    created_at
FROM public.businesses;

GRANT SELECT ON public.venues_public TO anon, authenticated;

-- ── 2. Venue Wallets & Subscriptions Financial Lockdown ───────────────────────

ALTER TABLE IF EXISTS public.venue_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.venue_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.venue_topup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.venue_outstanding_bills ENABLE ROW LEVEL SECURITY;

-- Revoke direct mutations from unauthenticated/anon roles
REVOKE INSERT, UPDATE, DELETE ON public.venue_wallets FROM anon, public;
REVOKE INSERT, UPDATE, DELETE ON public.venue_subscriptions FROM anon, public;
REVOKE UPDATE, DELETE ON public.venue_topup_requests FROM anon, public;
REVOKE UPDATE, DELETE ON public.venue_outstanding_bills FROM anon, public;

-- Drop obsolete open policies
DROP POLICY IF EXISTS "Public select venue_wallets" ON public.venue_wallets;
DROP POLICY IF EXISTS "Public update venue_wallets" ON public.venue_wallets;
DROP POLICY IF EXISTS "Public select venue_subscriptions" ON public.venue_subscriptions;
DROP POLICY IF EXISTS "Public update venue_subscriptions" ON public.venue_subscriptions;
DROP POLICY IF EXISTS "Public select venue_topup_requests" ON public.venue_topup_requests;
DROP POLICY IF EXISTS "Public update venue_topup_requests" ON public.venue_topup_requests;
DROP POLICY IF EXISTS "Public select venue_outstanding_bills" ON public.venue_outstanding_bills;
DROP POLICY IF EXISTS "Public update venue_outstanding_bills" ON public.venue_outstanding_bills;

-- Strict host-scoped policies for venue wallets
CREATE POLICY "Hosts can view own venue_wallets"
ON public.venue_wallets FOR SELECT
USING (venue_id IN (SELECT id FROM public.businesses WHERE host_id = auth.uid()));

CREATE POLICY "Hosts can view own venue_subscriptions"
ON public.venue_subscriptions FOR SELECT
USING (venue_id IN (SELECT id FROM public.businesses WHERE host_id = auth.uid()));

CREATE POLICY "Hosts can view own venue_topup_requests"
ON public.venue_topup_requests FOR SELECT
USING (venue_id IN (SELECT id FROM public.businesses WHERE host_id = auth.uid()));

CREATE POLICY "Hosts can insert own venue_topup_requests"
ON public.venue_topup_requests FOR INSERT
WITH CHECK (venue_id IN (SELECT id FROM public.businesses WHERE host_id = auth.uid()));

CREATE POLICY "Hosts can view own venue_outstanding_bills"
ON public.venue_outstanding_bills FOR SELECT
USING (venue_id IN (SELECT id FROM public.businesses WHERE host_id = auth.uid()));

COMMIT;
