# Quad Computing launch verdict, 2026-10-21

**Verdict: CODE-COMPLETE, NOT YET LAUNCH-READY.** Every open audit item (NV-01 to NV-19) now has a fix in source or
a database migration, and the full gate passes on the working tree. What is missing is not code: migration
20261021000003 is unapplied, nothing has run on staging, and five platform settings have not been confirmed.
The verdict turns to launch-ready when the "Remaining steps" below are checked off, and not before.

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

- Migrations `20261021000001` and `20261021000002` were applied to the production project on 2026-10-20 (confirmed
  from the SQL editor: revokes in place, three audit triggers present). They were not run on staging first.
- Migration `20261021000003` is **not applied** anywhere.
- The source changes (60 paths) are **uncommitted** on `main` and **not deployed**.
- Owners whose master PIN was cleared by block 2 of migration 1 have not been identified or told; the app now shows
  them a notice at sign-in (`MasterPinNotice`), and block 5 of `scripts/db/launch-checks-20261021.sql` lists them.

## Remaining steps to launch-ready

1. Staging: paste `scripts/db/staging-20261021-security-bundle.sql`, run every block of
   `scripts/db/launch-checks-20261021.sql`, then the smoke test in `docs/launch/platform-settings-checklist.md`.
2. Platform settings: check every row of `docs/launch/platform-settings-checklist.md` (GitHub environment and
   secret scope, Vercel scopes and `QC_PRODUCTION_SUPABASE_HOST`, edge header check).
3. Production: run the Logs Explorer query (block 6) for `permission denied for function`; apply migration
   `20261021000003`; confirm block 4.
4. Commit and deploy the source changes (commands below), then re-run the smoke test against production with a
   dummy venue only.
5. Owners with no master PIN: confirm each has set one or seen the notice.

Until 1-3 are done, the fixes for NV-02, NV-03, NV-07, NV-09, NV-14, NV-15 and NV-19 are verified by tests and
reading only, not by a running system. The audit run (run 2) stays `incomplete`: its verifier budget is spent, so
none of these fixes has an independent re-check.

## Commit

```bash
git add -A
```
```bash
git commit -m "fix(security): close audit run-2 open items NV-01 to NV-19" -m "Settlement guards (migration 20261021000003: session lock, replay, server-side cashback base); open status for a bill that settles in the same request; fee on every closed status; guest-order replay bound to table and day; venue lookup by id or exact slug with a shared negative cache; shared menu cache; rate-limit address from trusted headers only; production-config workflow split from CI; preview builds refuse the production Supabase project; master-PIN notice for owners; launch checks and staging bundle."
```
```bash
git tag -a v1.0.0-rc.1 -m "Release candidate: audit run-2 remediation; pending staging validation"
```
