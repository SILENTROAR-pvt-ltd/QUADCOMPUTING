# Quad Computing launch verdict, 2026-10-21

**Verdict: CODE AND DATABASE COMPLETE, NOT YET LAUNCH-READY.** Every open audit item (NV-01 to NV-19) has a fix
committed on `main` (`faff057`) or a migration applied to the database, and the full gate passes. What is missing is
confirmation: nothing has run on staging, the deployed build does not yet carry `faff057`, the post-migration checks
have not been read back, and five platform settings are unconfirmed. The verdict turns to launch-ready when the
"Remaining steps" below are checked off, and not before.

Updated 2026-10-21 after the user reported migration 20261021000003 applied and the remediation committed.

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
- Migration `20261021000003`: applied on 2026-10-21 per the user. Not yet confirmed by a read-back: block 4 of
  `scripts/db/launch-checks-20261021.sql` must return `has_session_guard = true` and
  `has_server_cashback_base = true`. Until it does, the database side of NV-03 and NV-19 is reported, not verified.
- Source: the remediation is committed on `main` as `faff057` (61 files). It is **not pushed and not deployed**; the
  live build still runs the pre-remediation code, so NV-01, NV-02, NV-07, NV-09, NV-11, NV-13, NV-14 and NV-15 are
  not in effect for guests and hosts until a deploy from `faff057` or later.
- Database and code are now out of step by design until that deploy: the new settlement function accepts the old
  application's calls (same signature), so the live app keeps working; the new guards simply apply earlier than the
  application-side checks that `faff057` adds.
- Owners whose master PIN was cleared by block 2 of migration 1: not yet identified or told. Block 5 of the launch
  checks lists them; `MasterPinNotice` will show them a notice once `faff057` is deployed.

## Remaining steps to launch-ready

1. Read back the production checks: run blocks 1-5 of `scripts/db/launch-checks-20261021.sql` and the Logs Explorer
   query in block 6. Expected: 7 functions present with `anon_can`/`auth_can` false; one `session_version` row; audit
   table with RLS and 3 triggers; block 4 both true; no `permission denied for function` rows since the revoke.
2. Staging: paste `scripts/db/staging-20261021-security-bundle.sql`, run the same checks, then the smoke test in
   `docs/launch/platform-settings-checklist.md` against a build of `faff057` (guest order and kitchen cancel; settle a
   bill, then settle it again and expect 409 `SESSION_ALREADY_SETTLED`; staff PIN login; an owner write behind the
   master PIN with and without the unlock; admin top-up approval).
3. Platform settings: check every row of `docs/launch/platform-settings-checklist.md` (GitHub `production`
   environment rules and secret scope; Vercel scopes and `QC_PRODUCTION_SUPABASE_HOST`; edge header check).
4. Push `main` and deploy `faff057`; confirm the preview build of a branch logs `[verify-env] checking non-production
   configuration` with no `FAIL`, and the production deploy passes the production-config workflow.
5. Owners with no master PIN: confirm each has set one or has seen the notice.

Until steps 1, 2 and 4 are done, the fixes for NV-02, NV-03, NV-07, NV-09, NV-14, NV-15 and NV-19 are verified by
tests and reading only, not by a running system. The audit run (run 2) stays `incomplete`: its verifier budget is
spent, so none of these fixes has an independent re-check.

## Record

| Date | Event |
|---|---|
| 2026-10-20 | Migrations 20261021000001 and 20261021000002 applied to production from the SQL editor (confirmed) |
| 2026-10-21 | Remediation committed on `main` as `faff057`; gate green (tsc 0, 1162 tests, migrations, guards, lint) |
| 2026-10-21 | Migration 20261021000003 applied (reported by the user; read-back pending) |

Optional release tag once step 4 is done:

```bash
git tag -a v1.0.0-rc.1 faff057 -m "Release candidate: audit run-2 remediation; staging validation pending"
```
