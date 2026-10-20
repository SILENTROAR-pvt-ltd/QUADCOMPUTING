# Database audit: Supabase linter and schema, 2026-10-21

Input: the Supabase database linter run of 2026-10-20 19:03 UTC (1 error, 28 warnings, ~70 info) and the
production schema dump. Method: each finding checked against the migration history and the application's callers.
Remediation: `supabase/migrations/20261021000004_linter_hardening.sql` plus one route change; verification in
`scripts/db/launch-checks-20261021.sql` block 7.

## Verdict

**No confirmed exposure, one structural risk worth closing before more venues sign up, and one data-protection
item that needs a product decision.** Nothing in the linter output is exploitable on its own today, because row-level
security has no permissive policy left for anonymous callers on any table that matters (the "RLS enabled, no policy"
list is the evidence). What the audit found is that the *grants* under that RLS are wider than they should be, so a
single mistaken policy would reopen a table to the public key. The migration removes that margin.

## Findings by linter rule

### ERROR: `security_definer_view` on `public.venues_public`

- What it is: a view over `businesses` exposing `id, name, business_name, slug, categories, created_at`, readable by
  anon, created in 20261008000007 as a sanitised directory.
- Risk: low. It exposes only public-menu fields. The rule fires because the view reads `businesses` with its owner's
  rights, bypassing the callers' RLS, which is exactly what it was for.
- Finding: **nothing reads it**. Neither this repository nor the Vibers Club repository references it (the menu
  directory is served by the API with the service role).
- Action: dropped in the migration. The error clears and one unused public surface goes.

### WARN: `function_search_path_mutable` (13 functions)

- What it is: trigger and helper functions created without `SET search_path`, so a caller's search path decides
  which `public.*` objects they resolve.
- Risk: low here. Exploiting it needs a role that can create objects in a schema ahead of `public` for the calling
  session; anon and authenticated cannot create objects. Still a correctness hazard.
- Action: `ALTER FUNCTION … SET search_path = public, pg_temp` on all 13 (they reference only `public` and
  `pg_catalog`; `auth.uid()` is already qualified where used).

### WARN: `anon_security_definer_function_executable` / `authenticated_security_definer_function_executable`

| Function | What it is | Risk | Action |
|---|---|---|---|
| `assign_order_number()`, `floor_ping()`, `table_ping()`, `log_admin_mutation()` | Trigger functions | None directly: a trigger function cannot be called usefully over `/rest/v1/rpc` (it returns `trigger`). The grant is still pointless. | EXECUTE revoked from PUBLIC, anon, authenticated for **every** trigger function in `public` |
| `get_auth_business_ids()` | RLS helper returning the caller's venue ids | None: returns an empty array without a uid | Kept for authenticated (the host's own policies call it); revoked from anon and PUBLIC |
| `venue_status_now(uuid)` | Open/closed status for a venue | Low: public information, but granted to anon by 20261016000011 while every caller is a server route on the service client | Revoked from anon and authenticated; service_role only |
| `deduct_recipe_inventory_for_order(uuid)` | Stock deduction for an order | Medium if callable by a host for another venue's order id (it takes any order id). 20261005000002 revoked it from authenticated, but 20261006000004's blanket `GRANT EXECUTE ON ALL FUNCTIONS` came after it, which is why the linter sees it again | Revoked; service_role only. Callers already use the service client |
| `generate_daily_z_report(uuid, date)` | Z-report for a venue and day | Low: the function checks that the caller is service_role or the venue's owner (20261008000001). Was reachable by any signed-in user with another venue's id, who would get an error | The Z-report route now calls it on the service client; EXECUTE revoked from anon and authenticated |

### WARN: `auth_leaked_password_protection`

- Supabase Auth is not checking host passwords against HaveIBeenPwned. Hosts sign in with email and password.
- Action: owner setting, Authentication → Providers → Email → "Prevent use of leaked passwords". One toggle; not in
  the migration because it is not SQL.

### INFO: `rls_enabled_no_policy` (~70 tables)

- What it is: RLS on, no policy, so PostgREST returns nothing to anon or authenticated; only the service role reads
  or writes these tables. This is the lockdown pattern the app was moved to in October (`20261005000002`,
  `20261008000008`, `20261011000001`, `20261018000002`): every guest and money route uses the service client.
- Risk: none. This is the safest state a table can be in short of revoking the grant too.
- Action: none needed. The migration also removes the underlying grants (below), so a future permissive policy on
  one of these tables would still not expose it to anon.

## Findings from the schema and migration history (not in the linter)

### 1. The anon role still holds SELECT/INSERT/UPDATE/DELETE on every table (structural, medium)

`20261005000002` revoked all table privileges from anon and set default privileges accordingly. `20261006000004`,
the next day, re-granted `SELECT, INSERT, UPDATE, DELETE ON ALL TABLES` to anon and re-established that as the
default for new tables. RLS is the only thing between the public key and the data, and RLS is one permissive policy
away from open: `20261004000003` had created `USING (true)` anon policies on `orders` (customer name, phone, delivery
address), `order_items`, `dine_in_sessions`, `guest_wallets`, `wallet_transactions`, `kitchen_tickets`; and
`20260930000005` on `rooms` (guest ID-proof numbers, phone, email, address) and `room_categories`. `20261005000002`
dropped every such policy that existed on 2026-10-05, and nothing recreates them, so they should be gone on
production. **Block 7a of the launch checks confirms it**; run it before the migration and keep the output.

Action in the migration: revoke anon's table, sequence and function privileges again, remove them from the default
privileges (including the default `EXECUTE` for authenticated on new functions), drop any policy that still admits
anon or is unconditionally true, and grant anon `SELECT` on exactly the two tables the browser reads for the public
menu (`catalog_items`, `restaurant_tables`; their public-read policies stay). The venue photo vault keeps its
`is_active` read policy for the Club's use.

### 2. Plain-text PIN columns still exist and may still hold values (low)

`businesses.admin_pin`, `businesses.staff_pin` and `staff_profiles.pin_code` are the pre-hashing columns. The
application reads them only when no hash exists and upgrades on first use. Where a hash exists the plain text is a
secret kept for no reason. Action in the migration: cleared wherever a hash is present (nobody is locked out; a row
with no hash keeps its value until the next successful PIN entry hashes it). Block 7d counts what is left. Dropping
the columns is a later migration, after a release where every venue has entered its PIN once.

### 3. Government ID numbers and guest contact details stored in plain text (product decision)

`rooms.guest_id_proof`, `rooms.id_type`, `rooms.id_number`, `rooms.guest_phone`, `rooms.guest_email`,
`rooms.guest_address`, and the same on `room_stay_logs`. Service-role-only today (no anon or host policy exposes
them beyond the owner's own venue), so this is not an exposure; it is a data-protection obligation under India's
DPDP Act for anyone running accommodation. Options, for the owner to decide: store the ID type and the last four
characters only; or encrypt `id_number` with pgsodium/`pgcrypto` and a key outside the database; and set a retention
period after check-out. Not changed here.

### 4. Bank details in `businesses` (accepted)

`bank_account_number`, `bank_ifsc_code`, `upi_id` are plain text, readable by the owner's own session through RLS
and by the profile route only behind the master PIN (NV-05). Column-level encryption would be an improvement; not a
launch item.

### 5. Schema consistency (informational)

- `wallet_redemptions.business_id` and `cafe_id` are `text`, `guest_wallets.guest_id` is `text`, `venue_photo_vault.venue_id`
  is `text`: no foreign keys, so a typo cannot be caught by the database. The settlement function compares them as
  text deliberately.
- `orders.status` has no CHECK and holds both cases (`settled`/`SETTLED`); every reader handles both. A CHECK with
  a one-time normalisation is a later cleanup.
- `promotions`, `club_moderation_log.actor_id`, `venue_photo_vault.venue_id` have no foreign key to their parent.
- `orders.payment_method` defaults to `'UPI'`, so a row saved without a tender reads as UPI in reports.

## What the migration changes for the application

Nothing visible. Every server route already uses the service role, which none of these grants or policies bind. The
one code change is the Z-report route, which now passes the service client instead of the host's own client (the
venue is still the one `requireHost` signed in, and the function re-checks ownership). The browser keeps anon `SELECT`
on `catalog_items` and `restaurant_tables` for the public menu marquee; the guest realtime hooks use broadcast
channels, not table subscriptions, except two `postgres_changes` listeners on `venue_live_offers` that already receive
nothing (the table has no anon policy) and fall back to polling.

## Result after applying the migration (2026-10-21 00:45 UTC)

Linter re-run: **0 errors, 2 warnings**: `get_auth_business_ids()` executable by `authenticated` (intentional: the
RLS helper the host's own policies call; returns an empty array without a uid) and `auth_leaked_password_protection`
(dashboard toggle, pending). Every other finding above is closed.

## Order of work

1. Run block 7 (a-d) of `scripts/db/launch-checks-20261021.sql` on production and keep the output as the "before".
2. Apply `20261021000004_linter_hardening.sql` on staging if one exists, then production.
3. Run block 7 again: 7a shows only the three public-read policies, 7b shows anon with SELECT on two tables, 7c
   shows `get_auth_business_ids` for authenticated and nothing for anon, 7d shows zeros.
4. Deploy the Z-report route change (same commit) and open the Z-report once as a host.
5. Re-run the Supabase linter: expect 0 errors, and warnings reduced to `auth_leaked_password_protection` (until the
   toggle is set) and the one deliberate `get_auth_business_ids` entry.
6. Decide item 3 (ID numbers) and schedule it.
