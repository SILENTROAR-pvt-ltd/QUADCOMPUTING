# QC launch: capacity maths, Supabase plan, and what is done / not done

Written 14 Oct 2026, the day before launch. Everything marked **verified** was run on this code today. Everything marked
**estimate** is arithmetic from reading the code plus stated assumptions: it is a planning number, not a measurement.
The first real load test replaces it.

## 1. Verified today (final code)

| Gate | Result |
|---|---|
| `tsc --noEmit` | 0 errors |
| `next lint --max-warnings=0` | 0 warnings, 0 errors (was 15 warnings) |
| `vitest run` | 97 files, 717 tests pass |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `check:migrations` | OK, 115 migrations |
| `next build` | compiles (final code, after the print-window and load-test edits) |

These tests run against an in-memory fake of Supabase. They prove the logic, not the live database, not RLS, not load.

## 2. Changed today (code)

| Change | Why |
|---|---|
| `lib/utils/safe-message.ts` + 43 API responses | 42 routes sent raw `error.message` on 500s (table and column names). Database-looking errors are now logged and replaced with a plain sentence; real validation messages still reach the user. |
| `next.config.mjs` security headers | HSTS (1 year), `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, no `X-Powered-By`. **No CSP yet** (needs its own tested change). |
| Deleted `app/api/sentry-example-api` | A route that throws on purpose, public. |
| Sentry sampling 100% to 10% in production | Tracing every request adds overhead and uses the trace quota in a day. Errors are still all reported. |
| Z-report CSV | A venue name like `=HYPERLINK(...)` ran as a formula in Excel. Now written as text. |
| `verify-env.mjs` | Warns when no Sentry DSN, and when production has no Upstash. |
| Lint: 15 to 0 | 2 real missing dependencies fixed, 1 effect made functional, 5 deliberately keyed effects and 7 `<img>` annotated with the reason. |
| Rate limits on public reads, venue cache, parallel status queries, order cap 20 to 40/min | Found by the load test; see section 3a. |
| Error boundary around every host screen | Contains the kitchen/billing hooks crash; reports to Sentry. |
| Guest polling 3.5-4 s to 8-10 s (30 s idle) | Kitchen status and settlement are pushed to phones; polling is only the safety net. About halves server load. Wallet poll 15 s to 60 s, paused in hidden tabs. |
| `escapeHtml` in the print windows (table placard, interim folio; the stay-invoice printer was escaped too, then deleted as unused on 15 Oct) | Guest names, items and add-ons were written into print HTML unescaped: a name like `<img onerror=...>` would run in the host's session. |
| Migration `20261014000003` (not applied) | `kot_status_logs` had no RLS. Deny-by-default; nothing in the app reads it. |

## 3. Capacity maths (estimate; measured results are in 3a below)

### Assumptions for one busy venue at peak
20 tables, 70% occupied (14), 2 phones per table = **28 guest phones**; 60% of them have an order in progress (17 active, 11
idle); **3 host tabs** (POS, kitchen, owner); 150 orders per day; 5 "peak-equivalent" hours of service per day.

### Requests (HTTP) per second, after today's change
| Source | Rate | Req/s |
|---|---|---|
| Active guest: status poll 1/10 s + order poll 1/8 s = 0.225/s | x 17 | 3.8 |
| Idle guest: 2 polls / 30 s = 0.067/s | x 11 | 0.7 |
| Guest wallet, 1/60 s | x 28 | 0.5 |
| Other guest background (offers etc.) | | ~1.0 |
| Host tabs, about 8 background loops of 15-20 s each | x 3 | ~1.5 |
| **Total per busy venue at peak** | | **~7.5** (was ~15 before today) |

Each request costs about 2.5 database queries, so about **19 queries/s** per busy venue at peak.

### What each limit allows (Pro plan figures from supabase.com/pricing and the Realtime quotas page)

| Limit | Free | Pro | Per busy venue | Busy venues, Free | Busy venues, Pro |
|---|---|---|---|---|---|
| Realtime connections (1 per open tab) | 200 | 500 | 28 + 3 = **31** | 6 | **16** (then $10 per 1,000) |
| Realtime messages / month | 2 M | 5 M | ~30 per order x 4,500 orders = **135 k** | 14 | 37 |
| Database size | 500 MB | 8 GB | ~5 KB per order + logs = **~0.4 GB / year** | ~1 venue-year | ~20 venue-years |
| Egress / month (API ~4 KB per request, plus menu photos ~1.5 MB per guest visit) | 5 GB | 250 GB | API ~16 GB + photos ~10 GB = **~26 GB** | **0** (one venue uses 5x the quota) | **~9** (then $0.09 / GB) |
| Monthly active users | 50 k | 100 k | ~300 guests / day = ~9 k MAU | 5 | 11 |
| Database connections | 60 direct / 200 pooler (Micro) | same | ~1 concurrent query | not binding | not binding |

**Reading it:** on Pro the first hard wall is **realtime connections at about 16 busy venues peaking at the same moment**,
and that wall costs $10 per extra 1,000 connections to move. Egress is a cost, not a wall: ~26 GB per busy venue is
about $2.30 per month over the included amount. The thing no table here can tell you is **database CPU**: the Pro plan starts on a Micro
instance (1 GB RAM, shared CPU). Supabase does not publish queries-per-second for it. My expectation is that Micro carries
several busy venues, but that is a guess until it is measured (section 5).

### Honest range
- **Free plan:** it cannot run even one busy venue for a month (egress alone is 5x the quota), has no backups, and pauses
  after a week without activity. Not an option for a live, paid product.
- **Pro plan, Micro compute (about $25/month):** plan for **about 10 busy venues at the same time, roughly 300
  guest phones and 30 host tabs**, as a working number until the load test says otherwise. Move to Small compute if
  database CPU passes about 60% in the Supabase reports.
- **"Users"** here means phones and tabs open at the same instant, not accounts. Total guests per day is a much larger number
  (one venue sees about 300 guests a day).

## 3a. Measured today (load test, replaces the guesses where it overlaps)

Rig: a production build (`next build` + `next start`) on one Windows laptop, talking to the **real Free-plan Supabase project
from Delhi** (about 130-170 ms per query). The generator is on the same laptop, so absolute latency is pessimistic. All
requests are GET: no order, wallet or table was written. Tools: `scripts/load-test.mjs` (web tier + database) and
`scripts/db-load-test.mjs` (database only).

| Virtual guests (venues at 28 each) | Req/s | p50 | p95 | Errors |
|---|---|---|---|---|
| 28 (1) | ~6 | ~300 ms | 513 ms | 0 |
| 84 (3) | ~19 | ~300 ms | ~540 ms | 0 |
| 168 (6) | ~37 | ~303 ms | 569 ms | 0 |
| 280 (10) | ~62 | rising | **~4.9 s** | 0 (slow, not failing) |

Per-guest rate measured at 0.22 req/s, matching the 0.225 in the model above.

| Ceiling test | Result |
|---|---|
| Status polling flat out through the web server (150 workers) | ~136 req/s |
| A route with no database call, same server | ~230-280 req/s |
| The same four status queries straight at the database, 100 workers | **412 polls/s (825 queries/s), p95 393 ms, 0 failures** |

What this says:
- **Proven on this rig: 6 busy venues (168 phones) under the 800 ms p95 budget with zero errors.** 10 venues was slow, not broken.
- The database is **not** the limit: it served 3x more polls per second than the web server on this laptop did. The 280-guest slowdown
  is the web tier plus the long trip to the database, both of which change in production (Vercel next to Supabase, several instances).
  So 10+ venues on Pro in the same region is plausible, but that part is **still an estimate**: it has not been run on Vercel.
- Cost of the finding: one Next process on this laptop sustained ~135 req/s. At 7.5 req/s per busy venue that is a ceiling near 18 venues per process.

Reduction work done because of the test: venue lookup cached 60 s (one query less per request), order status reads run in parallel
(5 sequential rounds down to 3), public read endpoints rate-limited, and the per-venue order cap raised from 20 to 40 per minute.

## 4. Do you need the Supabase Pro plan? **Yes, before launch.**
1. **No backups on Free.** Orders, wallets and cashback are money. Pro gives 7 days of daily backups. Point-in-time
   recovery is a $100/month add-on: worth turning on once real money flows.
2. **Free pauses after a week of inactivity**, which would take a quiet venue offline.
3. **Egress and database size on Free run out in the first weeks** (section 3).
4. **200 realtime connections on Free is about 6 busy venues**; Pro is 16 and extendable.
5. Turn on the spend cap awareness: Pro bills overage (egress, connections) rather than stopping.

Also check: the Vercel plan. Vercel's free Hobby plan does not allow commercial use; a paid launch needs Pro.

## 5. Not done, and why (do these before or right after launch)

| Item | Status |
|---|---|
| Apply migrations `20261014000001`, `000002`, `000003` in Supabase | **You must run them.** I cannot reach your database. Until `000002` is applied, no table bill earns cashback and the POS loads no guest wallet. |
| Run the live-database checks (RLS on every table, anon grants, anon-callable functions) | SQL is in the earlier audit message. Needs your Supabase dashboard. |
| Supabase Auth settings (email confirm, leaked-password protection, redirect allowlist, OTP limits) | Dashboard only. |
| Set production env vars: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, Upstash URL/token, `RATE_LIMIT_REQUIRE_REDIS=1` | Without Upstash, rate limits and duplicate-order guards are per server instance. |
| Put the Vercel region next to the Supabase region | The audit notes about 170 ms per query from Delhi; this is the biggest latency lever. |
| Content-Security-Policy | Needs its own tested change; a wrong policy blanks the app. |
| Load test on the deployed Vercel + Pro stack | Local-rig test done (section 3a). Re-run `scripts/load-test.mjs --allow-remote` against the real deployment with Pro active, before the first big venue. |
| End-to-end test: guest order, kitchen, settle, wallet | None exists. Run it once by hand on staging before launch. |
| "Rendered more hooks than during the previous render" on kitchen/billing | **Root cause not proven.** No code path breaks the rule (the lint rule is on and clean; one React copy; no conditional hooks), so it was most likely Fast Refresh while hook files were edited in dev. Contained: every host screen now sits in an error boundary that shows "Try again" and reports the component stack to Sentry. If it ever shows in production, that Sentry event names the component. |
| Club code in this repo | Decide whether `/api/club/*` ships tomorrow; the notes say Club has its own repo. |
