-- Restore check for a disaster-recovery drill. Run it against a RESTORED COPY of the database, never production:
--   psql "$DR_RESTORE_DATABASE_URL" -f scripts/db/verify-dr-restore.sql
-- Read-only. Any row returned by a block whose title starts with FAILS is a finding to act on before trusting the restore.

-- 1. The security migrations are present on the restored copy (the project tracks versions in supabase_migrations
--    when migrations run through the CLI; if that table is missing, check the schema by hand, block 6 below).
select 'migration applied' as check, v as version,
       exists (select 1 from supabase_migrations.schema_migrations s where s.version = v) as applied
from unnest(array['20261021000001', '20261021000002']) as v;

-- 2. Row counts for the money and ordering tables. Compare them with the counts taken from production at backup time.
select 'businesses' as table_name, count(*) as rows from public.businesses
union all select 'orders', count(*) from public.orders
union all select 'order_items', count(*) from public.order_items
union all select 'dine_in_sessions', count(*) from public.dine_in_sessions
union all select 'kitchen_tickets', count(*) from public.kitchen_tickets
union all select 'venue_wallets', count(*) from public.venue_wallets
union all select 'staff_profiles', count(*) from public.staff_profiles
union all select 'admin_audit_logs', count(*) from public.admin_audit_logs;

-- 3. FAILS: public tables with row security switched off.
select c.relname as table_without_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
order by 1;

-- 4. FAILS: tables with row security on but no policy at all (every client request would be refused).
select c.relname as table_with_no_policy
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
order by 1;

-- 5. FAILS: a client role can still run a money, ordering, provisioning, KOT or PIN function.
select p.oid::regprocedure as function_signature,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_run,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_run
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('deduct_venue_wallet_credits', 'execute_atomic_bill_settlement', 'submit_guest_order_atomic',
                    'provision_host_business', 'update_kot_status', 'verify_staff_pin', 'create_reservation_atomic')
  and (has_function_privilege('anon', p.oid, 'EXECUTE') or has_function_privilege('authenticated', p.oid, 'EXECUTE'));

-- 6. Columns the application reads after the security migrations (a missing one fails sign-in or settlement).
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and (table_name, column_name) in (('staff_profiles', 'session_version'), ('staff_profiles', 'pin_hash'),
                                    ('businesses', 'admin_pin_hash'), ('orders', 'guest_handle'));

-- 7. FAILS: any secret hash has reached the audit trail.
select count(*) as audit_rows_with_hashes
from public.admin_audit_logs
where new_data ?| array['admin_pin', 'admin_pin_hash', 'staff_pin', 'staff_pin_hash', 'pin_code', 'pin_hash']
   or old_data ?| array['admin_pin', 'admin_pin_hash', 'staff_pin', 'staff_pin_hash', 'pin_code', 'pin_hash'];
