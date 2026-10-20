-- Read-only launch checks for the 2026-10-21 security migrations. Nothing here writes. Run each block in the Supabase
-- SQL editor (the editor shows only the last statement's result, so run the blocks one at a time).

-- ── 1. Server-only functions (20261021000001 block 1) ─────────────────────────────────────────────────────────────
-- One row per expected function. `present = false` means the function does not exist on this database (the earlier
-- check returned 6 rows for 7 names: this names the missing one). anon_can / auth_can must be false on every present row.
WITH expected(proname) AS (
    VALUES ('deduct_venue_wallet_credits'), ('execute_atomic_bill_settlement'), ('submit_guest_order_atomic'),
           ('provision_host_business'), ('update_kot_status'), ('verify_staff_pin'), ('create_reservation_atomic')
)
SELECT e.proname,
       p.oid IS NOT NULL                                                   AS present,
       p.oid::regprocedure                                                 AS signature,
       CASE WHEN p.oid IS NULL THEN NULL ELSE has_function_privilege('anon', p.oid, 'EXECUTE') END          AS anon_can,
       CASE WHEN p.oid IS NULL THEN NULL ELSE has_function_privilege('authenticated', p.oid, 'EXECUTE') END AS auth_can,
       CASE WHEN p.oid IS NULL THEN NULL ELSE has_function_privilege('service_role', p.oid, 'EXECUTE') END  AS service_can
FROM expected e
LEFT JOIN pg_proc p ON p.proname = e.proname
LEFT JOIN pg_namespace n ON n.oid = p.pronamespace AND n.nspname = 'public'
ORDER BY e.proname;

-- ── 2. Staff session versioning (20261021000001 block 3) ──────────────────────────────────────────────────────────
-- Expect one row. Staff PIN login reads this column; without it every staff sign-in fails.
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'staff_profiles' AND column_name = 'session_version';

-- ── 3. Audit trail (20261021000002) ───────────────────────────────────────────────────────────────────────────────
-- Expect: the table, RLS on, three triggers, and no INSERT/UPDATE/DELETE grant to anon, authenticated or service_role.
SELECT to_regclass('public.admin_audit_logs') AS audit_table,
       (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.admin_audit_logs'::regclass) AS rls_enabled,
       (SELECT count(*) FROM pg_trigger WHERE tgname IN ('audit_businesses', 'audit_staff_profiles', 'audit_catalog_items') AND NOT tgisinternal) AS triggers;

SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'admin_audit_logs'
ORDER BY grantee, privilege_type;

-- ── 4. Settlement guards (20261021000003) ─────────────────────────────────────────────────────────────────────────
-- Expect one row whose source contains SESSION_ALREADY_SETTLED once the migration is applied.
SELECT p.oid::regprocedure AS signature,
       position('SESSION_ALREADY_SETTLED' IN pg_get_functiondef(p.oid)) > 0 AS has_session_guard,
       position('v_server_base' IN pg_get_functiondef(p.oid)) > 0           AS has_server_cashback_base
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'execute_atomic_bill_settlement';

-- ── 5. Venues whose master PIN was cleared, or was never set ──────────────────────────────────────────────────────
-- Block 2 of 20261021000001 cleared admin_pin where it still held the retired default '0000'. That update left no
-- trace (the audit trail was created after it), so this lists every venue with no master PIN at all: the cleared ones
-- are among them, and every venue listed should set one before the owner's next shift. The host app shows these
-- owners a notice at sign-in (components/host/control-center/MasterPinNotice.tsx).
SELECT b.id AS business_id,
       b.business_name,
       b.host_id,
       p.email AS owner_email,
       b.created_at
FROM public.businesses b
LEFT JOIN public.profiles p ON p.id = b.host_id
WHERE (b.admin_pin_hash IS NULL OR b.admin_pin_hash NOT LIKE 'scrypt:%')
  AND (b.admin_pin IS NULL OR btrim(b.admin_pin) IN ('', '0000'))
ORDER BY b.created_at;

-- ── 6. Permission-denied errors since the revoke (Supabase Logs > Postgres, Logs Explorer) ────────────────────────
-- Paste this in the Logs Explorer, not the SQL editor. A row here means a caller still reaches one of the revoked
-- functions with the anon or authenticated role; the error_severity/message name the function.
--
--   select cast(timestamp as datetime) as time, event_message, parsed.error_severity, parsed.user_name
--   from postgres_logs
--   cross join unnest(metadata) as m
--   cross join unnest(m.parsed) as parsed
--   where timestamp > timestamp_sub(current_timestamp(), interval 2 hour)
--     and regexp_contains(event_message, 'permission denied for function')
--   order by timestamp desc
--   limit 100;
--
-- Expected after the revoke: no rows. Staff PIN login (verify_staff_pin), the kitchen (update_kot_status) and
-- settlement (execute_atomic_bill_settlement) are the calls to watch.
