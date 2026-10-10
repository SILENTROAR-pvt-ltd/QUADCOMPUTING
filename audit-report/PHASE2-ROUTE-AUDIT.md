# Phase 2 – API Route Audit (57 route files)

Method: every `route.ts` under `app/api` was read in full, plus the shared guards (`lib/auth/guards.ts`, `lib/auth/guest-validate.ts`) and the services each money path calls. Not verified: live RLS policies (only migrations were read), runtime behaviour (no end-to-end run), and deeper service layers that were not on a traced path (`analytics.service`, `orders.service`, `kitchen.service`, `session.service`).

Corrections to the first audit: there are 57 route files (not 60+/75); `admin/topup-requests` **is** protected by `requireAdmin` (super_admin via `app_metadata`); the three `[id]` accommodation routes **are** wrapped by the error boundary. `{...result, data: result}` was intentional back-compat for the UI, not a plain bug.

Legend: **FIXED** = changed in this phase, **OPEN** = reported, not changed.

## Auth model (verified)
- `requireHost` – server-verified session (`getUser()`), tenant = `businesses.host_id`; client `business_id` is checked against owned businesses. Sound. Quirk: a host with several venues silently gets `businesses[0]` unless the client sends `business_id` (OPEN, medium).
- `requireAdmin` – `app_metadata.role === 'super_admin'`. Sound.
- Guest routes – **no auth by design** (QR + venue UUID + table). Everything below about guests follows from that.

## Status: P0 items 1–11 addressed in a second pass

| # | Resolution |
|---|---|
| 1, 2 | Guest wallets now require proof of ownership: each browser holds a random secret (`lib/utils/wallet-secret.ts`, header `x-guest-wallet-secret`); the server stores only its SHA-256 in `guest_wallet_claims` and binds each handle/phone to it on first use (`wallet-claim.service.ts`). Names are no longer identifiers. A handle another device already owns is reported (`handle_taken`) and the handle-claim screen asks for another one. Rate limited. Redemption codes are 6-digit CSPRNG values with a DB uniqueness retry. |
| 3 | Redemptions are DB-only (`wallet_redemptions`); the in-memory map is gone. Expired pending rows are flipped so they stop blocking new codes; verify only reports success if the row really moved to `verified`. Host and guest lookups read the DB. |
| 4 | Lobby is venue-scoped end to end: `business_id` on the lobby tables, one realtime channel per venue, membership checks on chats, ownership checks on invitations, no memory fallback, wide-open RLS policies replaced. Invitation ids are now the real DB uuid so accept/decline actually persists. |
| 5 | `guest/onboard`: no in-memory map, no fabricated error-path guest; a failed write is reported as `persisted: false` (guests are not blocked because `guest_sessions` only feeds presence). |
| 6 | `orders/update-status`: the status UPDATE is the claim (only the request that moves the order into COMPLETED/SERVED depletes stock and charges the fee); RPC errors are counted and returned as `depletion_errors`. |
| 7 | IST business days everywhere (new `lib/utils/business-day.ts`): Z-report service, EOD route, analytics date ranges, the EOD modal's date. Settled-only revenue (both `settled`/`SETTLED` spellings), real void count, no invented guest covers. Migration also locks `generate_daily_z_report` to the venue's owner and revokes `anon`. |
| 8 | Checkout is retry-safe: invoice written first, F&B orders linked, room released with a conditional update, orders/invoice marked `SETTLED` last (problems after release come back as `warnings`). Tender allowlist `CASH/CARD/UPI/SPLIT`. **Correction:** the earlier "409 unless OCCUPIED" guard would have broken payment, because the UI calls checkout twice (release, then settle with a tender). A call on a released room is now allowed only to settle that room's one pending invoice, exactly once. |
| 9 | Counter/takeaway fee is charged server-side in `host/orders/create`, keyed to the order id; outstanding-bill logging is idempotent; the browser call and `/api/host/sessions/fee` are removed. |
| 10 | `orders/history` (limit/offset, `truncated`), `expenses/bills`, `inventory/items`, accommodation history, and `auto-fill-images` (100 per call, `has_more`) are bounded. |
| 11 | `enforceRateLimit` added and applied to wallet, redeem, lobby, onboard, reviews, call-staff and session PATCH; `ai-ingest` has its own cap. Limits are sized for a venue sharing one Wi-Fi IP. |

### Deploy order (required)
1. Apply migrations `20261008000001` (z-report), `20261008000002` (wallet claims), `20261008000003` (lobby tables; creates them if missing) and `20261008000004` (schema drift fixes). Before that, confirm the older migrations are actually applied to the live database (see audit-report/PHASE4 notes: the live schema was found to be missing the lobby tables, `venue_topup_requests` UTR uniqueness and `usage_ledger.balance_after`).
2. Deploy the code. Without migration 2 the wallet endpoints return 503 by design (fail closed); without migration 3 the lobby API errors because `business_id` does not exist.
3. Set `SUPABASE_SERVICE_ROLE_KEY`, Redis (`UPSTASH_REDIS_REST_URL/TOKEN`), then `RATE_LIMIT_REQUIRE_REDIS=1`.

### Behaviour changes to know about
- A guest who clears browser storage loses access to a handle's wallet from that device (support can delete the row in `guest_wallet_claims` to release it). Wallets that exist today are claimed by whoever uses the handle first after deploy.
- Wallets keyed only by guest name (no handle or phone) can no longer be read; nothing is deleted.
- Pre-migration lobby messages have no venue and are no longer shown.
- Review `verified` is now always false for new reviews (it was client-controlled).

### Still open
All P1 items below, plus: post-insert free-tier checks need a reconciliation job; no per-host business cap; plaintext PINs; `venue-guard.test.ts` touches the live DB; Realtime `postgres_changes` subscriptions on `orders`, `kitchen_tickets`, `dine_in_sessions` are unfiltered (they rely on RLS to decide what each client receives).

## P0 – as originally reported (all addressed above)
| # | Route / file | Problem |
|---|---|---|
| 1 | `guest/wallet` GET, `lib/services/wallet/cashback.service.ts` | Wallet is looked up by a plain string (handle, phone **or name**) with no secret, unthrottled. Response also returns the guest's wallets at **other venues** (`cafe_wallets`, `global_balance`). Anyone with a venue UUID can probe balances. |
| 2 | `guest/wallet/redeem` POST + `redemption.service.ts` | Same identity weakness lets a caller mint a redemption code against someone else's balance. Codes are `QC-RDM-` + 4 digits (9,000 values, `Math.random`); a collision **overwrites** another guest's pending record in memory. |
| 3 | `guest/wallet/redeem` GET, `host/wallet/redeem` GET | Read only the per-instance in-memory map. On serverless/multi-instance the POS cannot find a code created on another instance. `verifyRedemptionCode` swallows the DB status update (`catch {}`), so "verified/redeemed" can exist only in memory. |
| 4 | `guest/lobby` GET/POST/PATCH | No venue scoping: `lobby_messages` GET returns the latest 30 across **all venues**. Chat reads by `chat_id` only; PATCH accepts any `invitation_id`. DB errors are swallowed into per-instance memory arrays, so messages appear then vanish. |
| 5 | `guest/onboard` | Every failure path returns `success: true` with a fabricated id; sessions live in a per-instance `Map`. Later calls can reference a customer that was never stored. |
| 6 | `host/orders/update-status` | Read-then-write race: two concurrent COMPLETED requests both deplete inventory. `rpc('deduct_inventory_stock')` results are never checked, so failed deductions report success. Arbitrary `status` string accepted. |
| 7 | `host/analytics/eod-z-report` | Day boundary uses server-local time (UTC on most hosts) so an IST venue's 00:00–05:30 sales land on the previous day. No status filter (cancelled/unsettled orders counted as revenue). `guest_covers` invents `2` per order, `voids` hard-coded `0`. A second, different implementation exists in `analytics/z-report`, so the two reports can disagree. |
| 8 | `host/accommodations/rooms/[id]/checkout` | Multi-step and non-transactional: invoice insert/update errors are ignored, then the room is reset and the guest data wiped. Client `payment_method` alone marks the invoice `SETTLED`. (Double-submit now blocked, see FIXED.) |
| 9 | Takeaway/counter fee | Charged by a fire-and-forget browser call (`settlement-helper.util.ts`). A host can skip it; the platform fee for those bills is optional. Needs to move server-side into bill creation. |
| 10 | Unbounded reads | `host/orders/history`, `expenses/bills`, `inventory/items`, `catalog/auto-fill-images` select everything. Beyond the API's row cap (1,000 by default on Supabase) results are silently truncated; `auto-fill-images` does one sequential UPDATE per item and will time out on large catalogs. |
| 11 | Rate limiting | Only `guest/order` and `staff/verify-pin` are limited (plus `ai-ingest` now). `call-staff`, `reviews`, `lobby`, `session`, `wallet*`, `onboard` are open to spam. |

## P1
- `guest/session` POST still returns fabricated data on some DB failures (service layer not changed); `guest/menu` `findMatchingTable` uses fuzzy `includes`, so table "1" can match "T-10".
- `host/accommodations/rooms/[id]/status`: every PATCH with `status: 'OCCUPIED'` inserts a new `room_stay_logs` row, so edits duplicate stays in history.
- `host/kitchen/tickets` PATCH: arbitrary status string; direct-update fallback bypasses the RPC's validation; `staff_id` taken from the body.
- `host/inventory/audit`: per-item updates unchecked, audit rows inserted last; partial failure leaves stock changed with no audit record. `inventory/items` PATCH changes stock with no log. `theoretical_stock` is client-supplied.
- `host/promotions`, `expenses/*`, `inventory/items` POST: no numeric validation (NaN/negative/over-100%). `expenses/advances` does not verify `staff_id` belongs to the venue.
- `host/catalog/update`: `item_type` can be changed after creation, which sidesteps the creation-time fee (service → food).
- `host/provision`: no cap on businesses per host; `hostOnboardingSchema` has no `.max`.
- `error.message` is returned to clients in ~35 routes (DB messages leak).
- `businesses.admin_pin` / `staff_pin` stored and compared in plaintext (hidden from `/profile`, never returned).
- `host/sessions*` still return the duplicated `data` copy.
- `InventoryWorkspace`: `activeSuppliers = 3` is a hard-coded fake metric.
- `ai-ingest` uses model id `gemini-3.6-flash`; confirm it exists for your key.
- `venue-guard.test.ts` calls `evaluateFeeGuard` with the real `adminDb()` (hits the live Supabase with a fake uuid). Mock it.

## FIXED in this phase
| File | Change |
|---|---|
| `lib/services/billing/venue-guard.service.ts` | Wallet/subscription read errors and a 5 s timeout now **fail closed** (503 `billing_check_unavailable`); previously a DB error provisioned a synthetic ₹0 wallet and allowed the order. Provisioning handles the unique-constraint race (23505) by reading the winner's row. +3 tests. |
| `lib/services/session/settle-session.service.ts` | Uses the guard's real status (503 vs 402). |
| `lib/services/wallet/free-tier.service.ts` | Throws `FreeTierUnavailableError` on any count failure (room branch previously ignored errors entirely). |
| `app/api/host/catalog/create/route.ts` | The only pre-insert caller: returns 503 instead of creating an unbilled item. The other five callers run post-insert and still log-and-continue (OPEN: they need a reconciliation job). |
| `app/api/host/sessions/fee/route.ts`, `fee-guard.service.ts` | Client `overrideCost` removed (a host could set its own fee to ₹0); only `bill_generate` accepted; negative/NaN overrides rejected in the engine. |
| `lib/services/wallet/topup-request-create.service.ts` | Insert failures (including duplicate UTR) now surface as errors; previously a per-instance memory copy was returned as `success: true` and the admin never saw it. |
| `lib/services/guest-session/update-session.service.ts` | Guests may only set `bill_requested`; update scoped to the venue; no longer reports success when every DB write failed. |
| `app/api/guest/call-staff/route.ts` | Returns failure when the notification is not stored (UI still ignores the response: OPEN). |
| `app/api/host/accommodations/rooms/[id]/checkout/route.ts` | First attempt blocked double-submits with a blanket 409; that was wrong (see Status item 8) and has been replaced. |
| `app/api/venue/offers/route.ts` | DB is the only source of truth (same fix `photo-vault` already had); PATCH 404s when nothing matched. |
| `app/api/host/catalog/ai-ingest/route.ts` | 10 scans/hour/venue and a ~6 MB image cap on the paid Gemini call. |
| `app/api/host/catalog/bulk-price-update/route.ts` | Bounds on the change; reports failure if any update fails (502). |
| `app/api/host/inventory/ocr-ingest/route.ts`, `InventoryWorkspace.tsx` | Stub that injected fake purchases into real stock now returns 501; UI shows the error. |
| `lib/services/catalog/delete-item.service.ts`, `app/api/host/catalog/route.ts` | UUID-validates the id (it was interpolated into a PostgREST `.or()`), verifies ownership, scopes every delete to the venue. |
| `app/api/host/analytics/z-report/route.ts`, `z-report-export.service.ts` | Invented fallback GSTIN replaced with `NOT REGISTERED`. |
| `app/api/host/profile/update/route.ts` | Returns an error when the business update fails or matches no rows (previously "saved successfully" regardless). |
| `app/api/host/catalog/recipe/route.ts` | GET scoped to the venue. |
| (Phase 1) `lib/supabase/admin.ts`, `guest/order/route.ts`, `rate-limiter.ts` | Service-role key mandatory; duplicate `data` copy dropped; Redis check in production (`RATE_LIMIT_REQUIRE_REDIS=1` to fail closed). |

## Route-by-route verdict
`OK` = auth and tenant scoping verified, no issue beyond the general ones above.

| Route | Auth | Verdict |
|---|---|---|
| admin/topup-requests | requireAdmin | OK; `adminId` from body overrides the authenticated admin in the audit trail (OPEN, low) |
| guest/call-staff | none (QR) | FIXED honesty; unthrottled, `type` unvalidated |
| guest/catalog | none | OK |
| guest/lobby | none | P0 #4 |
| guest/menu | none | P1 fuzzy table match |
| guest/onboard | none | P0 #5 |
| guest/order | none + rate limit + billing guard + idempotency | OK (Phase 1/2 fixes) |
| guest/reviews | none | OK scoping; `rating`, `verified`, `images` client-controlled, unthrottled |
| guest/session | none | FIXED PATCH; POST/GET OK |
| guest/wallet | none | P0 #1 |
| guest/wallet/redeem | none | P0 #2, #3 |
| host/accommodations/categories | requireHost | OK |
| host/accommodations/history | requireHost | OK; `search` interpolated into `.or()` (cannot cross tenants, can alter results); `limit` unbounded |
| host/accommodations/rooms | requireHost | OK (fee check is post-insert) |
| host/accommodations/rooms/[id]/checkout | requireHost | FIXED double submit; P0 #8 |
| host/accommodations/rooms/[id]/dossier | requireHost | OK |
| host/accommodations/rooms/[id]/orders | requireHost | OK |
| host/accommodations/rooms/[id]/status | requireHost | P1 duplicate stay logs |
| host/analytics, eod-report | requireHost | not traced into `analytics.service` |
| host/analytics/eod-z-report | requireHost | P0 #7 |
| host/analytics/z-report | requireHost | FIXED GSTIN |
| host/catalog (root) | requireHost | FIXED DELETE |
| host/catalog/ai-ingest | requireHost | FIXED |
| host/catalog/auto-fill-images | requireHost | P0 #10 |
| host/catalog/bulk-insert | requireHost | post-insert fee check (OPEN) |
| host/catalog/bulk-price-update | requireHost | FIXED |
| host/catalog/create | requireHost | FIXED |
| host/catalog/delete | requireHost | scoping delegated to `executeCatalogDelete` (not read) |
| host/catalog/recipe | requireHost | FIXED GET |
| host/catalog/update | requireHost | P1 item_type |
| host/expenses/advances, bills, staff | requireHost | P1 validation; unbounded reads |
| host/inventory/audit | requireHost | P1 non-atomic |
| host/inventory/items | requireHost | P1 |
| host/inventory/ocr-ingest | requireHost | FIXED |
| host/kitchen/tickets | requireHost | P1 |
| host/orders/create | requireHost | not traced into `createHostOrder` |
| host/orders/history | requireHost | P0 #10 |
| host/orders/update-status | requireHost | P0 #6 |
| host/profile | requireHost | OK (PINs stripped) |
| host/profile/update | requireHost | FIXED |
| host/promotions | requireHost | P1 validation |
| host/provision | requireHost (no business yet) | P1 no cap |
| host/security/status | requireHost | OK |
| host/sessions | requireHost + idempotency | OK |
| host/sessions/fee | requireHost | FIXED |
| host/staff/verify-pin | requireHost + rate limit | P1 plaintext PIN; limiter is per-instance without Redis |
| host/tables | requireHost | OK |
| host/wallet | requireHost | FIXED (top-up) |
| host/wallet/outstanding | requireHost | OK |
| host/wallet/redeem | requireHost | P0 #3 |
| orders, tables | re-export of guest/order, host/tables | OK |
| venue/offers | GET public, writes requireHost | FIXED |
| venue/photo-vault | GET public, writes requireHost | OK |

## Capacity (derived from the code, not load-tested)
- **No application-level cap** on hosts, venues per host, tables, rooms, staff or guests. The limits are your Supabase plan (database connections, Auth email rate limit on signup, API row cap, egress) and how many serverless instances you run.
- **Polling load per guest with an open order**: `/api/guest/order` every 3.5 s and `/api/guest/session` every 4 s, about 0.55 requests/s per active table (idle tables: 15 s, about 0.13/s). 100 active tables is roughly 55 req/s, 200 is about 110 req/s, each doing several queries, all on the service-role client. Kitchen already uses Realtime; moving guest order status to Realtime would cut this sharply.
- **Per-instance state** (`inMemoryRedemptions`, rate limiter without Redis, `inMemoryGuestSessions`, lobby arrays) means correctness degrades as you add instances. Keep to one instance until P0 #2–#5 are fixed, or move that state to the database/Redis.
- Host signup uses Supabase Auth directly from the browser. Check your project's Auth email rate limit; the default built-in mailer is very low and will cap how many hosts can verify per hour.
