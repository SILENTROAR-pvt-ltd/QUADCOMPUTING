-- Database linter and anon-surface hardening, from the Supabase linter run of 2026-10-20 19:03 UTC and the schema
-- review of 2026-10-21 (docs/launch/database-audit-2026-10-21.md). Hand-apply in staging first, then production.
-- Re-running is safe. Each block names the linter rule it closes.
--
-- Nothing here changes what the application can do: every server route uses the service role, which these grants
-- and policies do not bind. The only browser-side read with the anon key is the public menu's catalog_items and
-- restaurant_tables, which keep their SELECT grant and public-read policies.

BEGIN;

-- ── 1. security_definer_view (ERROR): public.venues_public ────────────────────────────────────────────────────────
-- A sanitised definer view of businesses for anonymous venue lookups. Neither this app nor the Vibers Club app reads
-- it (the menu directory is served by the API with the service role), so it is removed rather than kept as an
-- accepted exception.
DROP VIEW IF EXISTS public.venues_public;

-- ── 2. function_search_path_mutable (WARN): pin search_path on the flagged functions ─────────────────────────────
-- All of these reference only public and pg_catalog objects (auth.uid() is schema-qualified where used).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'new_wallet_code', 'assign_wallet_code', 'billing_day_of', 'update_outstanding_bills_updated_at',
        'update_topup_requests_updated_at', 'deduct_inventory_stock', 'sync_order_item_business_id',
        'sync_wallet_transaction_business_id', 'set_wallet_transaction_idempotency_key', 'sync_table_status_on_order',
        'keep_session_guest_handle', 'club_enforce_adult', 'club_ledger_immutable'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', r.sig);
  END LOOP;
END $$;

-- ── 3. anon/authenticated_security_definer_function_executable (WARN): trigger functions ─────────────────────────
-- A trigger function never needs EXECUTE for the role whose DML fires it, so no client role needs it on any of them.
-- This covers assign_order_number, floor_ping, table_ping, log_admin_mutation and every other trigger in public.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prorettype = 'pg_catalog.trigger'::regtype
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;

-- ── 4. The same rule for the three RPCs the application calls only with the service role ─────────────────────────
-- venue_status_now: every caller is a server route on the service client (app/api/guest/venue-status, reserve).
-- deduct_recipe_inventory_for_order: called from the inventory services on the service client and from
--   update_kot_status inside the database.
-- generate_daily_z_report: the Z-report route now calls it on the service client (it already scopes the venue through
--   requireHost; the function's own owner check stays as defence in depth).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('venue_status_now', 'deduct_recipe_inventory_for_order', 'generate_daily_z_report')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- get_auth_business_ids() is the RLS helper the host's own policies call, so authenticated keeps it; anon never has a
-- uid and gets nothing from it.
REVOKE EXECUTE ON FUNCTION public.get_auth_business_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_auth_business_ids() TO authenticated, service_role;

-- ── 5. The anon role's table surface ─────────────────────────────────────────────────────────────────────────────
-- 20261005000002 took every table privilege from anon; 20261006000004 then re-granted SELECT, INSERT, UPDATE, DELETE
-- on ALL tables to anon and made that the default for new tables. Row-level security has held the line since
-- (a table with no anon policy returns nothing), but a single permissive policy would open a table to the public key
-- again. The grant goes, the default goes with it, and the two public-menu tables the browser reads get SELECT back.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
-- Also stop granting EXECUTE on every new function to authenticated by default: a new function is server-only until
-- a migration says otherwise.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM authenticated;

GRANT SELECT ON public.catalog_items, public.restaurant_tables TO anon;

-- Any policy that admits anon, or admits everyone unconditionally, goes, except the three deliberate public reads:
-- the menu's dishes and tables, and the venue's active photo vault. (Policies are OR-ed, so one open policy opens the
-- table however strict the others are.)
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname NOT IN ('Allow public read of catalog_items', 'Allow public read of restaurant_tables',
                             'Allow public read access on venue_photo_vault')
      AND ( lower(coalesce(qual, '')) IN ('true', '(true)')
         OR lower(coalesce(with_check, '')) IN ('true', '(true)')
         OR 'anon' = ANY (roles::text[]) )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
    RAISE NOTICE 'dropped open policy % on %', p.policyname, p.tablename;
  END LOOP;
END $$;

-- ── 6. Legacy plain-text PINs ────────────────────────────────────────────────────────────────────────────────────
-- Every PIN is verified against its scrypt hash and the plain-text column is only read when no hash exists. Where a
-- hash exists, the plain text is dead data holding a secret: clear it. A row with no hash keeps its plain text until
-- its next successful PIN entry upgrades it (venue-pin.ts), so nobody is locked out.
UPDATE public.businesses SET admin_pin = NULL WHERE admin_pin IS NOT NULL AND admin_pin_hash LIKE 'scrypt:%';
UPDATE public.businesses SET staff_pin = NULL WHERE staff_pin IS NOT NULL AND staff_pin_hash LIKE 'scrypt:%';
UPDATE public.staff_profiles SET pin_code = NULL WHERE pin_code IS NOT NULL AND pin_hash IS NOT NULL AND pin_hash <> '';

COMMIT;

NOTIFY pgrst, 'reload schema';
