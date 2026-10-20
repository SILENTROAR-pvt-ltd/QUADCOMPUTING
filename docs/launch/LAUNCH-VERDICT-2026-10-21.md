# Quad Computing launch verdict, 2026-10-21

**Verdict: NOT YET LAUNCH-READY; code, database, repository and deployment are complete, and validation of the
running system is what remains.** Every open audit item (NV-01 to NV-19) has a fix on `origin/main` (`0785fe4`,
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
- Migration `20261021000003`: applied on 2026-10-21 per the user. Not yet confirmed by a read-back: block 4 of
  `scripts/db/launch-checks-20261021.sql` must return `has_session_guard = true` and
  `has_server_cashback_base = true`. Until it does, the database side of NV-03 and NV-19 is reported, not verified.
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

1. ~~Push `main` and deploy~~ (done: `origin/main` = `0785fe4`; deployment `dpl_Hd8qngcFk72beMPDaEb7nuwBGj1r`
   Ready). Still to confirm: the `production-config` workflow run for `0785fe4` passed in GitHub Actions.
2. Read back the production checks: run blocks 1-5 of `scripts/db/launch-checks-20261021.sql` and the Logs Explorer
   query in block 6. Expected: 7 functions present with `anon_can`/`auth_can` false; one `session_version` row; audit
   table with RLS and 3 triggers; block 4 both true; no `permission denied for function` rows since the revoke.
3. Smoke test against the deployed `0785fe4` build with a dummy venue only (staging if one exists, otherwise a test
   venue on production): guest order and kitchen cancel; settle a bill, then settle it again and expect 409
   `SESSION_ALREADY_SETTLED`; staff PIN login; an owner write behind the master PIN with and without the unlock;
   admin top-up approval. The per-step expectations are in `docs/launch/platform-settings-checklist.md`.
4. Platform settings: check every row of `docs/launch/platform-settings-checklist.md` (GitHub `production`
   environment rules and secret scope; Vercel scopes and `QC_PRODUCTION_SUPABASE_HOST`; edge header check). A
   preview build of any branch must log `[verify-env] checking non-production configuration` with no `FAIL`.
5. Owners with no master PIN (block 5 of the launch checks, run 2026-10-21): exactly one venue, **Bombay Rasoi**
   (`189664b2-99e7-4d45-ac50-ffb647ef97df`). Its owner sees the in-app notice at next sign-in; closed when they set a
   PIN under Profile → Security (block 5 then returns no rows).

Until steps 2 and 3 are done, the fixes for NV-02, NV-03, NV-07, NV-09, NV-14, NV-15 and NV-19 are verified by
tests and reading only, not by a running system. The audit run (run 2) stays `incomplete`: its verifier budget is spent,
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

Optional release tag once step 4 is done:

```bash
git tag -a v1.0.0-rc.1 0785fe4 -m "Release candidate: audit run-2 remediation; staging validation pending"
```
