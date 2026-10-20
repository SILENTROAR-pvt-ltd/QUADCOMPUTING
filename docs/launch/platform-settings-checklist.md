# Launch checklist: settings outside the repository

The source audit (run 2, 2026-10-20) left items that no code change can close, because the control lives in a
platform setting. Each one below names the setting, what to set, and how to confirm it. Record the date and who
checked it in the last column; the launch verdict depends on every row being checked.

## GitHub (NV-07: production secrets reachable from a pull-request run)

The repository now references production secrets only in `.github/workflows/production-config.yml`, which only a push
to `main` triggers. That holds only with these settings:

| Setting | Value | Confirm | Checked |
|---|---|---|---|
| Settings > Environments > `production` > Deployment branches and tags | Selected branches: `main` only | A workflow run from any other ref shows "environment protection rules" and does not start | |
| Settings > Environments > `production` > Required reviewers | At least one owner account | A push to `main` waits for approval before the job starts | |
| Settings > Secrets and variables > Actions > Repository secrets | None of: `SUPABASE_SERVICE_ROLE_KEY`, `UPSTASH_REDIS_REST_TOKEN`, `LLM_API_KEY`, `STAFF_SESSION_SECRET`, `NEXT_PUBLIC_SUPABASE_*`, `UPSTASH_REDIS_REST_URL` | The repository-secrets list is empty of these names; each exists only under the `production` environment | |
| Settings > Actions > General > Fork pull request workflows | Require approval for all outside collaborators | | |
| Settings > Actions > General > Workflow permissions | Read repository contents and packages permissions | | |

## Vercel (NV-15: preview builds holding production secrets)

A preview or development build runs branch code with the environment of its scope. The build now fails when a
non-production build's Supabase URL is the production project (`scripts/verify-env.mjs`), which needs one variable:

| Setting | Value | Confirm | Checked |
|---|---|---|---|
| Environment Variables > `QC_PRODUCTION_SUPABASE_HOST` | The production project host, e.g. `<ref>.supabase.co`, in all three scopes (Production, Preview, Development). Not a secret. | Present in all scopes | |
| Environment Variables > `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Production scope: production project. Preview and Development scope: the **staging** project only | A preview deployment's build log shows `[verify-env] checking non-production configuration` and no `FAIL` line | |
| Environment Variables > `UPSTASH_REDIS_REST_URL/TOKEN`, `LLM_API_KEY`, `STAFF_SESSION_SECRET` | Preview and Development scope: separate staging values, or unset | No production value has a Preview or Development entry | |
| Settings > Git > Fork protection | On (default) | | |
| Settings > Git > Deploy Hooks / Ignored Build Step | Optional: `git diff --quiet HEAD^ HEAD -- . ':!docs'` to skip docs-only builds | | |
| Settings > Deployment Protection > Vercel Authentication | On for Preview | A preview URL asks for a Vercel sign-in | |

## Edge and forwarded headers (NV-14)

| Setting | Value | Confirm | Checked |
|---|---|---|---|
| Hosting | All traffic enters through the Vercel edge (`VERCEL=1` at runtime). The limiter then reads only the edge-set address. | `curl -H 'x-forwarded-for: 1.2.3.4' https://<prod>/api/guest/menu?...` is limited under the caller's real address, not 1.2.3.4 (check the `ratelimit:` keys in Upstash) | |
| Any self-hosted or proxied deployment | Set `TRUSTED_PROXY_HOPS=<number of proxies that append to x-forwarded-for>` (or `TRUST_CF_CONNECTING_IP=1` behind Cloudflare). Until set, every client shares one rate-limit bucket. | `verify-env` prints no `TRUSTED_PROXY_HOPS` warning | |

## Supabase (migrations 20261021000001-3)

| Step | Confirm | Checked |
|---|---|---|
| Staging: run `scripts/db/staging-20261021-security-bundle.sql`, then every block of `scripts/db/launch-checks-20261021.sql` | Block 1: all 7 present, `anon_can`/`auth_can` false. Block 2: one row. Block 3: table, RLS true, 3 triggers. Block 4: both true. | |
| Staging smoke test | Guest order and kitchen cancel; settle a bill; settle it again (expect 409 `SESSION_ALREADY_SETTLED`); staff PIN login; owner write behind the master PIN with and without the unlock; admin top-up approval | |
| Production: migration 20261021000003 (1 and 2 are already applied, 2026-10-20) | Block 4 of the launch checks returns both true | |
| Production: owners without a master PIN (block 5) | Each listed owner has set a PIN, or has seen the in-app notice (`MasterPinNotice`) | |
| Production: Logs Explorer query (block 6) | No `permission denied for function` rows since the revoke | |

## Policy decisions recorded (NV-13, NV-19, NV-01)

These were owner decisions; the code now implements them. Change the code, not just the setting, to change them.

- NV-13: a bill saved at the till under **any** closed status (SETTLED, COMPLETED, SERVED, PAID, BILLED, CLOSED) pays
  the per-bill fee once, keyed `SETTLE_<order id>`; CANCELLED pays nothing (`lib/services/orders/bill-status.util.ts`).
- NV-19: the cashback base is the bill the server priced (the order's lines, else its stored subtotal); the till may
  lower it, never raise it; once per order **and** once per session (`20261021000003_settlement_guards.sql`).
- NV-01: a guest-order replay is honoured only for the same venue, same table and within 24 hours; otherwise 409
  `IDEMPOTENCY_KEY_REUSED` with nothing about the matched order (`submit-order.service.ts`).
