# PART A — DATABASE EXTRACTION (Live Supabase DB)

> **Execution Note**: The current environment has access only to application source code and runtime environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). There is no direct PostgreSQL TCP connection string (`DATABASE_URL`), `psql` binary, or database MCP tool enabled in this workspace. All database introspection queries (A1–A15) have been written verbatim to [db-queries.sql](file:///d:/work/desktp/folder%20desktop/Desktop/Quad%20Computing%20V1/audit-pack/db-queries.sql) and are documented below with their exact status.

---

### A1: RLS Status Per Table
```sql
select c.relname, c.relrowsecurity, c.relforcerowsecurity from pg_class c
join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') order by 1;
```
**Status**: `UNRUN: select c.relname, c.relrowsecurity, c.relforcerowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') order by 1;`  
**Reason**: Direct PostgreSQL database connection/MCP tool unavailable in local development environment.  
*Migration Code SSOT Verification*: Based on migrations up to `20261004000003_production_pillars_rls_and_inventory.sql`, RLS is explicitly commanded (`ENABLE ROW LEVEL SECURITY`) on: `orders`, `order_items`, `dine_in_sessions`, `guest_wallets`, `wallet_transactions`, `operational_expenses`, `raw_inventory_items`, `inventory_logs`, `kitchen_tickets`, `staff_notifications`, `staff_profiles`, `room_categories`, `rooms`, `room_stay_logs`, `venue_reviews`, `venue_photo_vault`, `venue_subscriptions`, `venue_wallets`, `usage_ledger`, `venue_outstanding_bills`, `venue_live_offers`, `venue_topup_requests`.

---

### A2: ALL Policies (public + storage), Full Text
```sql
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies where schemaname in ('public','storage') order by tablename, policyname;
```
**Status**: `UNRUN: select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check from pg_policies where schemaname in ('public','storage') order by tablename, policyname;`  
**Reason**: Direct PostgreSQL database connection/MCP tool unavailable in local development environment.  
*Migration Code SSOT Verification*: Full policy definitions are documented in `audit-pack/04-PART-B-TIER1-MIGRATIONS.md`.

---

### A3: ALL Functions, Full Definitions
```sql
select p.oid::regprocedure as signature, p.prosecdef as security_definer, p.provolatile,
 p.proconfig, p.proacl, pg_get_userbyid(p.proowner) as owner, pg_get_functiondef(p.oid) as def
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prokind in ('f','p') order by 1;
```
**Status**: `UNRUN: select p.oid::regprocedure as signature, p.prosecdef as security_definer, p.provolatile, p.proconfig, p.proacl, pg_get_userbyid(p.proowner) as owner, pg_get_functiondef(p.oid) as def from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind in ('f','p') order by 1;`  
**Reason**: Direct PostgreSQL database connection/MCP tool unavailable in local development environment.  
*Migration Code SSOT Verification*: Key RPC functions declared in migrations:
- `public.get_auth_business_ids()` (`SECURITY DEFINER STABLE`)
- `public.execute_atomic_bill_settlement(...)` (`SECURITY DEFINER`)
- `public.deduct_recipe_inventory_for_order(p_order_id uuid)` (`SECURITY DEFINER`)
- `public.deduct_venue_wallet_credits(...)` (`SECURITY DEFINER`)
- `public.sync_order_item_business_id()`
- `public.sync_wallet_transaction_business_id()`

---

### A4: Who Can EXECUTE Which Function
```sql
select p.oid::regprocedure as fn, r.rolname, has_function_privilege(r.oid,p.oid,'EXECUTE') as can_exec
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
cross join (select oid, rolname from pg_roles where rolname in ('anon','authenticated','service_role')) r
where n.nspname='public' and p.prokind in ('f','p') order by 1,2;
```
**Status**: `UNRUN: select p.oid::regprocedure as fn, r.rolname, has_function_privilege(r.oid,p.oid,'EXECUTE') as can_exec from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join (select oid, rolname from pg_roles where rolname in ('anon','authenticated','service_role')) r where n.nspname='public' and p.prokind in ('f','p') order by 1,2;`  
**Reason**: Direct PostgreSQL database connection/MCP tool unavailable in local development environment.

---

### A5: Table Grants to anon/authenticated/PUBLIC
```sql
select table_name, grantee, string_agg(privilege_type, ',' order by privilege_type) privs
from information_schema.role_table_grants where table_schema='public'
and grantee in ('anon','authenticated','PUBLIC') group by 1,2 order by 1,2;
```
**Status**: `UNRUN: select table_name, grantee, string_agg(privilege_type, ',' order by privilege_type) privs from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated','PUBLIC') group by 1,2 order by 1,2;`  
**Reason**: Direct PostgreSQL database connection/MCP tool unavailable in local development environment.

---

### A6: Indexes + Usage
```sql
select tablename, indexname, indexdef from pg_indexes where schemaname='public' order by 1,2;
select relname, indexrelname, idx_scan from pg_stat_user_indexes where schemaname='public' order by idx_scan;
```
**Status**: `UNRUN: select tablename, indexname, indexdef from pg_indexes where schemaname='public' order by 1,2;`  
**Reason**: Direct PostgreSQL database connection/MCP tool unavailable in local development environment.

---

### A7: Constraints (incl. FK ON DELETE rules)
```sql
select conrelid::regclass as tbl, conname, contype, pg_get_constraintdef(oid) as def
from pg_constraint where connamespace='public'::regnamespace order by 1,2;
```
**Status**: `UNRUN: select conrelid::regclass as tbl, conname, contype, pg_get_constraintdef(oid) as def from pg_constraint where connamespace='public'::regnamespace order by 1,2;`  
**Reason**: Direct PostgreSQL database connection/MCP tool unavailable in local development environment.

---

### A8: Triggers (Full Definitions)
```sql
select tgrelid::regclass as tbl, tgname, pg_get_triggerdef(oid) as def
from pg_trigger where not tgisinternal and tgrelid in
 (select oid from pg_class where relnamespace='public'::regnamespace) order by 1,2;
```
**Status**: `UNRUN: select tgrelid::regclass as tbl, tgname, pg_get_triggerdef(oid) as def from pg_trigger where not tgisinternal and tgrelid in (select oid from pg_class where relnamespace='public'::regnamespace) order by 1,2;`  
**Reason**: Direct PostgreSQL database connection/MCP tool unavailable in local development environment.

---

### A9: Views (+ security_invoker setting)
```sql
select schemaname, viewname, definition from pg_views where schemaname='public';
select relname, reloptions from pg_class where relkind in ('v','m') and relnamespace='public'::regnamespace;
```
**Status**: `UNRUN: select schemaname, viewname, definition from pg_views where schemaname='public';`  
**Reason**: Direct PostgreSQL database connection/MCP tool unavailable in local development environment.

---

### A10: Realtime Publication + Replica Identity
```sql
select * from pg_publication_tables where pubname='supabase_realtime';
select relname, relreplident from pg_class where relnamespace='public'::regnamespace and relkind='r';
```
**Status**: `UNRUN: select * from pg_publication_tables where pubname='supabase_realtime';`  
**Reason**: Direct PostgreSQL database connection/MCP tool unavailable in local development environment.

---

### A11: Storage Buckets
```sql
select id, name, public, file_size_limit, allowed_mime_types from storage.buckets;
```
**Status**: `UNRUN: select id, name, public, file_size_limit, allowed_mime_types from storage.buckets;`  
**Reason**: Direct PostgreSQL database connection/MCP tool unavailable in local development environment.

---

### A12: Extensions, Cron, Role Settings, Sizes
```sql
select extname, extversion from pg_extension order by 1;
select jobid, schedule, command, active from cron.job;
select rolname, rolconfig from pg_roles where rolname in ('anon','authenticated','authenticator','service_role');
select relname, n_live_tup, pg_size_pretty(pg_total_relation_size(relid)) as size
from pg_stat_user_tables order by n_live_tup desc;
```
**Status**: `UNRUN: select extname, extversion from pg_extension order by 1;`  
**Reason**: Direct PostgreSQL database connection/MCP tool unavailable in local development environment.

---

### A13: Migrations: Applied vs Files
```sql
select version, name from supabase_migrations.schema_migrations order by version;
```
**Status**: `UNRUN: select version, name from supabase_migrations.schema_migrations order by version;`  
**Reason**: Direct PostgreSQL database connection/MCP tool unavailable in local development environment.  
*Migration Files in Repo*: 54 timestamped migration files verified in `supabase/migrations/` (detailed in Part B / Index).

---

### A14: Slow Queries (pg_stat_statements)
```sql
select left(query,200) q, calls, round(mean_exec_time::numeric,2) mean_ms, round(total_exec_time::numeric) total_ms
from pg_stat_statements order by total_exec_time desc limit 20;
```
**Status**: `UNRUN: select left(query,200) q, calls, round(mean_exec_time::numeric,2) mean_ms, round(total_exec_time::numeric) total_ms from pg_stat_statements order by total_exec_time desc limit 20;`  
**Reason**: Direct PostgreSQL database connection/MCP tool unavailable in local development environment.

---

### A15: Data-Sanity (Counts Only)
```sql
select count(*) filter (where admin_pin='0000') default_admin_pin, count(*) total from businesses;
select status, count(*) from orders group by 1;
select table_id, count(*) from dine_in_sessions where status<>'closed' group by 1 having count(*)>1;
select guest_id, business_id, count(*) from guest_wallets group by 1,2 having count(*)>1;
select utr_number, count(*) from venue_topup_requests group by 1 having count(*)>1;
select count(*) pending_expired from wallet_redemptions where status='pending' and expires_at<now();
select count(*) neg_raw_stock from raw_inventory_items where current_stock<0;
select count(*) orders_no_items from orders o where not exists (select 1 from order_items i where i.order_id=o.id);
select count(*) orders_total_mismatch from orders where total_amount is distinct from grand_total;
```
**Status**: `UNRUN: select count(*) filter (where admin_pin='0000') default_admin_pin, count(*) total from businesses;`  
**Reason**: Direct PostgreSQL database connection/MCP tool unavailable in local development environment.

---

### Supabase Cloud Dashboard Metrics
- **Security Advisor Output**: `UNKNOWN` (Requires Supabase Cloud web console access)
- **Performance Advisor Output**: `UNKNOWN` (Requires Supabase Cloud web console access)
- **Auth Settings**:
  - Email Confirmations: `UNKNOWN`
  - Anonymous Sign-Ins: `UNKNOWN`
  - JWT Expiry: `UNKNOWN` (Default Supabase setting: 3600 seconds)
  - Password Policy: `UNKNOWN`
  - Rate Limits: `UNKNOWN`
- **Plan Tier**: `UNKNOWN` (To be filled by founder in Part E)
- **Region**: `UNKNOWN` (Project URL: `https://webreflspgfpwvgazcze.supabase.co`)
- **PITR (Point-in-Time Recovery)**: `UNKNOWN`
- **Connection Pool Mode & Size**: `UNKNOWN`
