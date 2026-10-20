# Quad Computing launch verdict, 2026-10-21

**Verdict: NOT YET LAUNCH-READY; code, database (read back and confirmed), repository and deployment are
complete, and exercising the running system is what remains.** Every open audit item (NV-01 to NV-19) has a fix on `origin/main` (`0785fe4`,
which includes `faff057` and the earlier batch `5734e2f`) or a migration applied to the database; the full gate
passes, including under Vercel's build conditions; and the production deployment `dpl_Hd8qngcFk72beMPDaEb7nuwBGj1r`
is reported Ready from `0785fe4`. The verdict turns to launch-ready when the "Remaining steps" below are checked
off, and not before: none of the fixes has yet been exercised against the running system.

Updated 2026-10-21 after the deployment of `0785fe4` (reported by the user; the deployment's commit is read from the
Vercel dashboard, not from this machine).

## Gate on the working tree (run 2026-10-21)

| Check | Result |
|---|---|
| `tsc --noEmit` | exit 0 |
| `vitest run` | 167 files, 1162 tests, all passed |
| `check:migrations` | OK, 134 migrations |
| `audit:guards` | 147 owner-side handlers guarded before their first database call |
| `lint` | no warnings or errors |
| `verify-env` preview-scope guard | fails a preview build pointed at the production project (exit 1), passes a staging one (exit 0) |

## The 19 items

| Item | State | Where |
|---|---|---|
| NV-01 order replay reads another guest's order | Fixed in source, tested | `submit-order.service.ts`: replay only for same venue, same table, within 24 h; otherwise 409 with nothing about the matched order; PII already stripped |
| NV-02 refused settlement leaves a SETTLED order | Fixed in source, tested | `create-order.service.ts` / `order-mutation.service.ts`: a bill that settles in the same request is inserted `open`; only the settlement marks it settled; stock is deducted after settlement, not on save |
| NV-03 repeat settlement under a new order id | Fixed in migration + source, tested in source | `20261021000003_settlement_guards.sql`: session row locked, closed session refuses (`SESSION_ALREADY_SETTLED`), settled order replays with no writes, cashback once per session; `settle-context.ts` refuses first |
| NV-04 staff PIN clears master counter | Fixed, tested | `verify-pin/route.ts` |
| NV-05 bank details without unlock | Fixed, tested | `profile/route.ts` |
| NV-06 `0000` master-PIN hash | Fixed, tested | `venue-pin.ts` |
| NV-07 CI secrets reachable from a PR | Fixed in source; settings pending | `production-config.yml` (push to main only; `ci.yml` references no secrets); GitHub environment rules in the checklist |
| NV-08 event-interest overwrite | Fixed, tested | `events/interest/route.ts` |
| NV-09 unknown-venue lookups uncached | Fixed in source | per-IP cap; venue misses remembered 60 s in memory and in Upstash (`business-resolver.service.ts`, `shared-cache.ts`); menu payload shared across instances (`venue-menu-cache.ts`) |
| NV-10 session POST exposes guest name/phone | Fixed, tested | `guestSafeOrder` on every guest-facing order |
| NV-11 name-form venue lookup | Fixed in source, tested | UUID by id or exact slug only; no lookup by name; a UUID miss is not retried as a slug |
| NV-12 master lock client-only | Fixed, tested | server guard on wallet, expenses, catalog writes |
| NV-13 PAID/BILLED/CLOSED skip the fee | Fixed in source, tested | `bill-status.util.ts`: every closed status is fee-bearing once; CANCELLED never |
| NV-14 forwarded-header trust | Fixed in source, tested | `getClientIp`: Vercel edge headers, or a declared `TRUSTED_PROXY_HOPS`; otherwise one shared bucket, never a client-named address |
| NV-15 preview builds hold production secrets | Fixed in source; settings pending | `verify-env.mjs` fails a non-production build whose Supabase URL is `QC_PRODUCTION_SUPABASE_HOST`; Vercel scopes in the checklist |
| NV-16 top-up approval via session client | Fixed; grant live | service client; grant revoked on production 2026-10-20 |
| NV-17 wallet verify trusts body venue | Fixed, tested | 403 on mismatch |
| NV-18 recipe cost visible to staff | Fixed, tested | cost stripped for staff sessions |
| NV-19 cashback base from the request | Fixed in migration + source, tested in source | base is the order's stored lines, else stored subtotal; the till may lower it, never raise it |

## Production state today

- Migrations `20261021000001` and `20261021000002`: applied to the production project on 2026-10-20, confirmed from
  the SQL editor (revokes in place, three audit triggers present). Not run on staging first.
- Migration `20261021000003`: applied on 2026-10-21 and **confirmed by read-back** (block 4: `has_session_guard`
  and `has_server_cashback_base` both true on the deployed function).
- Production read-back of blocks 1-5 (2026-10-21):
  - Block 1: 6 of the 7 named functions present, each with `anon_can` and `auth_can` false and `service_can` true.
    `verify_staff_pin` does not exist on production; nothing in the application calls it (staff PIN checks run in
    the application), so there is nothing to revoke. The earlier "6 rows for 7 names" is explained.
  - Block 2: `staff_profiles.session_version integer default 0` present.
  - Block 3: `admin_audit_logs` grants are `SELECT` for `authenticated` and owner rights for `postgres` only; no
    `service_role`, `anon`, or write grant to any client role. The three `audit_*` triggers were confirmed on
    2026-10-20; the `ENABLE ROW LEVEL SECURITY` statement precedes them in the same script, so it ran too.
  - Block 4: both guards present (above).
  - Block 5: one venue without a master PIN (Bombay Rasoi; see step 5).
- Source: `origin/main` is `0785fe4` (confirmed by `git fetch` on 2026-10-21). It holds the remediation `faff057`
  (61 files), the earlier lead-fix batch `5734e2f` (NV-01 to NV-24 of run 1), and `0785fe4`, which pins `VERCEL` in
  the test environment after the first Vercel build of `98f3e29` failed in the build-time suite. The push triggers
  the `production-config` workflow, whose result is not visible from this machine.
- Deployment: `dpl_Hd8qngcFk72beMPDaEb7nuwBGj1r`, reported Ready from `0785fe4`. The deployment made earlier the
  same day from `cca0078` carried no fixes and is superseded. With this build live, every source fix is in effect.
- Database and code are in step: migrations 1-3 applied (3 pending read-back), application from `0785fe4`.
- Owners whose master PIN was cleared by block 2 of migration 1: not yet identified or told. Block 5 of the launch
  checks lists them; `MasterPinNotice` will show them a notice once `faff057` is deployed.

## Remaining steps to launch-ready

1. ~~Push `main` and deploy~~ (done; the live build is `44168f4`). The `production-config` workflow: checked on
   GitHub 2026-10-21, it had **failed on every one of its 10 runs**, because the `Production` environment holds no
   secrets (`verify-env` found no `NEXT_PUBLIC_SUPABASE_URL`, `ANON_KEY` or `SERVICE_ROLE_KEY`). GitHub holds no
   secrets at all, repository or environment, which is the strongest answer to NV-07. The workflow duplicates the
   strict `verify-env` that already runs inside every Vercel production build, so the recommendation is to delete
   it rather than feed it secrets. **Owner decision pending** (see the checklist, GitHub section, options a/b).
2. ~~Read back the production checks, blocks 1-6~~ (done 2026-10-21, all as expected; see "Production state").
   Block 6 (Unified Logs, Postgres, last 24 hours, message contains `permission denied for function`): no rows.
   Note: with one pilot venue and little traffic, an empty log only shows that nothing that ran hit a revoked
   function; step 3 is what exercises every caller.
3. Smoke test on the live `0785fe4` build, venue Bombay Rasoi (the owner's own pilot venue, used as the test venue
   at the owner's choice), run 2026-10-21 23:49-23:58 IST in the Browser pane with the owner signed in:
   - Guest order from the QR menu (table T-07, 1 Cutting Chai, order `f39806e4…`): **pass**. POST 200, ticket
     KOT-7180 on the kitchen screen, "Start preparing" PATCH 200. The guest-facing order payload carried no customer
     name, phone or idempotency key. The product has no "cancel ticket" control in the kitchen UI or its API, so a
     kitchen cancel is not a user flow; the ticket was advanced instead, which exercises the same database function.
   - Settle the bill from Billing (cash): **pass**. 200; session closed, table vacant, ₹0.70 cashback credited, ₹3
     platform fee recorded (as outstanding: the venue wallet held ₹0).
   - Settle the same visit again (the till's request naming the closed session, no order): **pass**, 409
     `SESSION_ALREADY_SETTLED`. Retry of the settled order itself: 200, cashback 0, inventory `already_deducted`.
   - Staff PIN sign-in: **pass** (run and confirmed by the owner).
   - Owner write behind the master PIN, locked then unlocked: run and reported passing by the owner, then
     **corroborated and found a gap**. With the master session unlocked, a no-op catalog price write returned 200
     (correct). After pressing "Lock now" in the UI, the same write still returned 200. Cause: "Lock now" cleared only
     the page's `sessionStorage` flag; the server-held unlock cookie set at PIN entry (15 minutes) was never cleared,
     so writes behind the master PIN kept passing from that browser until it expired. The guard itself refuses a
     request without the cookie (tested), so the gap is in the lock, not the guard.
     **Fixed in `app/api/host/security/lock/route.ts` + `useSecurityStatus.ts`** (lock clears the cookie; test added),
     commit `44168f4`, deployed 2026-10-21 00:05 IST. **Re-tested on the live build: pass.** With the pre-fix cookie
     still valid the write returned 200 (the old gap, observed live); after `POST /api/host/security/lock` the same
     write returned 403 `MASTER_UNLOCK_REQUIRED`. The UI's "Lock now" calls that endpoint (`markUnlocked(false)`).
   - Admin top-up approval: **pass** (run and confirmed by the owner).
4. Platform settings (`docs/launch/platform-settings-checklist.md`):
   - GitHub: **read** 2026-10-21 in the Browser pane: no repository secrets, no environment secrets or variables;
     `Production` deployment branches "No restriction", no required reviewer; `production-config` failing on every
     run. Open decision: delete that workflow (recommended) or give the environment its secrets plus the branch
     rule and reviewer.
   - Vercel: **pending**. `QC_PRODUCTION_SUPABASE_HOST` in all three scopes; Preview/Development `SUPABASE_*`
     pointing at a staging project (or, with no staging project, an accepted risk recorded here); a preview build
     logging `[verify-env] checking non-production configuration` with no `FAIL`.
5. ~~Owners with no master PIN~~ (done): block 5 listed exactly one venue, **Bombay Rasoi**
   (`189664b2-99e7-4d45-ac50-ffb647ef97df`); its owner set a master PIN during the smoke test on 2026-10-21
   (`/api/host/security/status` → `isAdminPinSet: true`). Block 5 should now return no rows.

Step 3 is done: NV-02, NV-03, NV-10, NV-12, NV-16 and NV-19 have been exercised on the running system. NV-07,
NV-09, NV-14 and NV-15 are platform-side and are verified by tests, reading and the step-4 checklist. The audit run (run 2) stays `incomplete`: its verifier budget is spent,
so none of these fixes has an independent re-check.

## Record

| Date | Event |
|---|---|
| 2026-10-20 | Migrations 20261021000001 and 20261021000002 applied to production from the SQL editor (confirmed) |
| 2026-10-21 | Remediation committed on `main` as `faff057`; gate green (tsc 0, 1162 tests, migrations, guards, lint) |
| 2026-10-21 | Migration 20261021000003 applied (reported by the user; read-back pending) |
| 2026-10-21 | Verdict update committed as `98f3e29` |
| 2026-10-21 | Vercel deployment reported while `origin/main` was still `cca0078`: that build carries no fixes |
| 2026-10-21 | `main` pushed; `origin/main` = `98f3e29` (confirmed). Vercel build of `98f3e29` failed in the build-time test suite (`VERCEL=1` in the container) |
| 2026-10-21 | `0785fe4` pins `VERCEL` in the test environment; pushed; suite verified green under `VERCEL=1` locally |
| 2026-10-21 | Deployment `dpl_Hd8qngcFk72beMPDaEb7nuwBGj1r` Ready from `0785fe4` (reported by the user) |
| 2026-10-21 | Launch check block 5 run on production: one venue without a master PIN (Bombay Rasoi) |
| 2026-10-21 | Launch checks blocks 1-4 run on production: all as expected; migration 3 confirmed; `verify_staff_pin` absent and unused |
| 2026-10-21 | Block 6: no `permission denied for function` rows in the last 24 hours of Postgres logs |
| 2026-10-21 | Smoke test on the live build (Bombay Rasoi): guest order, kitchen, settle, repeat-settle 409, staff PIN, top-up approval pass; master PIN set on the venue |
| 2026-10-21 | Smoke test finding: "Lock now" did not clear the server unlock cookie, so writes behind the master PIN still passed after locking. Fixed (`/api/host/security/lock`, `44168f4`) |
| 2026-10-21 | `44168f4` deployed; re-test on the live build: write after lock → 403 `MASTER_UNLOCK_REQUIRED`. Smoke test complete, all steps pass |

Optional release tag once step 4 is done:

```bash
git tag -a v1.0.0-rc.1 0785fe4 -m "Release candidate: audit run-2 remediation; staging validation pending"
```
