# Phase 5 – Release runbook (testing, deployment, rollback)

Status on 2026-10-07: **not ready to deploy**. Code checks pass and the database is in sync; three external items block launch (see Go / No-go).

## Gate status (with evidence)
| Gate | Result | Evidence |
|---|---|---|
| Typecheck / lint / build | PASS | `tsc` clean, `next lint` 0 errors, `next build` compiled (Phase 4). |
| Unit + pipeline tests | PASS | 144 tests, 23 files, hermetic (no credentials, no network). |
| Unauthenticated smoke (dev server, real DB, read-only) | PASS 94/94 | `scripts/unauth-smoke.mjs`. **It was previously discovering 0 of 80 host/admin/venue handlers** (regex only matched `export function`), so its past "PASS" proved little. Fixed; it now refuses to run if fewer than 80 checks are generated. Note: `middleware.ts` answers every unauthenticated `/api/host/*` with 401 before routing, so this mostly proves the middleware; route-level guards were verified by code review in Phase 2. |
| Health check | PASS (degraded) | New `GET /api/health`: config ok, database reachable, rate limiter **degraded** (no Redis). |
| Secrets | PASS | Service-role key referenced only in `lib/supabase/admin.ts`; no `.env*` tracked in git; no key-like literals in source; 0 client components import server-only modules. |
| Production env completeness | **FAIL** | `verify-env` against `.env.local`: Supabase keys ok (service key verified as `service_role`), Gemini ok; **missing `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `RATE_LIMIT_REQUIRE_REDIS=1`**. |
| Database in sync with code | PASS | `scripts/db/verify-schema.sql` returned 0 rows after applying migrations `20261008000001`-`20261008000004`: all tables, columns, functions, indexes, constraints and grants the code depends on are present. (Function argument lists were not compared; see the optional second query in the script.) |
| Dependencies | **RISK** | `npm audit`: Next.js 14.2.35 has 1 critical / several high advisories (see below). |
| Capacity | NOT MEASURED | Script ready: `scripts/load/guest-polling.mjs`; needs a preview URL and a test venue. |

## Next.js advisories – what applies here
All are fixed in **Next 15.5.24+** (npm suggests 16.x; 15.5.24 is enough). Upgrading 14 → 15 is a breaking upgrade (async `cookies()` and route `params`, React 19), so it is a separate task, not a launch-eve edit.

| Advisory | Applies? |
|---|---|
| RCE on Windows-hosted servers (critical) | **Not in production** (Vercel is Linux). **Yes on your machine:** `npm run dev` binds `0.0.0.0`, exposing the dev server to your whole network. Use `next dev -H 127.0.0.1` unless you are testing from a phone on the same Wi-Fi. |
| RCE in Image Optimization API with AVIF (critical) | Reduced: `images.unoptimized: true` and no remote image domains configured. Not proven absent. |
| Server Components DoS (several high) | **Yes** – App Router app. Availability risk, not data exposure. |
| Server Actions DoS/SSRF, rewrites SSRF/smuggling, i18n middleware bypass, WebSocket SSRF | No – the app has no Server Actions, rewrites, i18n or custom server. |
| PostCSS / source-map-js | Build-time only; needs attacker-controlled CSS. Low. |

## Go / No-go before production
1. ~~**Database**~~ – done: `verify-schema.sql` returns no rows. Re-run it after any future migration.
2. **Redis** – create an Upstash Redis database; set `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` and `RATE_LIMIT_REQUIRE_REDIS=1` in Vercel → Project → Settings → Environment Variables (Production), and in the GitHub `production` environment.
3. **Version control** – git is not installed on this machine, so nothing has been committed and the plan's `pre-audit-fixes` tag was never created. Install Git (or GitHub Desktop), then:
   ```
   git switch -c audit-fixes
   git tag audit-baseline 4df8d92
   git add -A
   git commit -m "Audit fixes: security, sync, wallet ownership, lobby scoping, CI"
   git push -u origin audit-fixes --tags
   ```
   Open a PR; CI must be green.
4. **Next.js** – decide: launch on 14.2.35 with the DoS exposure above, or upgrade to 15.5.24+ first.

## Deployment (after Go)
1. Merge the PR. Vercel builds with `npm run build:release` (env check → tests → build); a failure stops the deploy.
2. Before promoting, test the **preview** URL:
   - `curl https://<preview>/api/health` → `"status":"ok"` (not `degraded`).
   - `SMOKE_BASE_URL=https://<preview> node scripts/unauth-smoke.mjs` → 94/94.
   - Optional capacity: `LOAD_BASE_URL=https://<preview> LOAD_CAFE_ID=<test venue> LOAD_TABLES=50 LOAD_SECONDS=60 node scripts/load/guest-polling.mjs` (watch p95 latency and error rate; 429s are expected because one machine shares one IP).
   - Manual: one guest order, one room check-in → checkout → payment, one wallet redemption, bill request, kitchen status change.
3. Promote to production; repeat the health check and smoke test against the production URL.

## Rollback
- **Code:** Vercel → Deployments → previous production deployment → *Instant Rollback* (seconds, no rebuild). Or revert the merge commit; the baseline is commit `4df8d92`.
- **Database: no rollback needed for code rollback.** The four new migrations are backward compatible with the old code: 1 only tightens who may call the Z-report function (the old code calls it as the signed-in host), 2 adds a new table, 3 creates tables with nullable venue columns, 4 only widens constraints and adds a column and unique indexes. The old code keeps working with them applied.
- Only the unique UTR index can reject something the old code allowed (a duplicate payment reference), which is the intended fix.

## Known limits that remain
- Postgres functions (order submit, bill settlement, KOT status, top-up approval, fee deduction) are not covered by automated tests; they need an integration run against a separate test Supabase project.
- `middleware.ts` calls Supabase Auth on every request, and host routes call it again in `requireHost`: two auth round-trips per host API call.
- The guest UI polls every 3.5–4 s per open table (about 0.55 requests/s per table). Realtime would cut this sharply.
- P1 items from `PHASE2-ROUTE-AUDIT.md` are still open.
