-- ============================================================================
-- 20261014000003_kot_status_logs_rls.sql   (safe to re-run)
--
-- kot_status_logs (created in 20261006000001) was left without Row Level Security and without a revoke, so a signed-in
-- user could read every venue's kitchen audit rows through the API. Nothing in the app reads this table: it is written
-- only by update_kot_status(), a SECURITY DEFINER function that runs as the table owner and is unaffected by RLS.
-- RLS on with no policies means no direct access for anon or authenticated; service_role is unaffected.
-- Apply in the Supabase SQL editor. Nothing is dropped.
-- ============================================================================

ALTER TABLE public.kot_status_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.kot_status_logs FROM PUBLIC;
REVOKE ALL ON TABLE public.kot_status_logs FROM anon;
REVOKE ALL ON TABLE public.kot_status_logs FROM authenticated;
GRANT ALL ON TABLE public.kot_status_logs TO service_role;

NOTIFY pgrst, 'reload schema';

-- ----------------------------------------------------------------------------
-- AUDIT (read-only), after applying:
--   select relrowsecurity from pg_class where oid = 'public.kot_status_logs'::regclass;   -- expect: true
--   select grantee, privilege_type from information_schema.role_table_grants
--   where table_schema = 'public' and table_name = 'kot_status_logs' order by 1, 2;        -- expect: service_role (+ postgres) only
-- ----------------------------------------------------------------------------
