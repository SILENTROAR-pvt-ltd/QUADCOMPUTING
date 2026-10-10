# Phase 4 – UI, pipelines and CI/CD

## What the plan assumed vs. what was measured
| Plan said | Measured |
|---|---|
| "Add loading states to 40+ components" | 66 component files make 105 `fetch` calls. Almost all already track loading. The real defect was different: **mutations that report success without checking the response** (`fetch` only rejects on network errors, so a 4xx/5xx looked like success). Fixed at 8 sites, below. |
| "Add error handling to 20+ components" | Same finding; 13 mutation calls had no response check, of which 6 mattered (the rest are deliberate fire-and-forget realtime relays or already handled). |
| "Fix `OccupiedRoomHeader` checkout error state" | That component has no checkout button. Checkout lives in `useOccupiedRoomDossier`, which already has a loading state and shows errors. Nothing to fix. |

## UI fixes (shared helper: `lib/utils/api-client.ts`)
| Component | Bug | Fix |
|---|---|---|
| `ServiceCallBar` | Inserted into `staff_notifications` straight from the browser (no validation/rate limit) and always toasted "Waiter notified!", even when nothing was stored. | Goes through `/api/guest/call-staff` only and toasts the real result. |
| `useLiveOffers` + `LiveOffersManager` | Optimistic toggle/delete never checked the response, so failures left the UI wrong. | Checks the result, rolls back by refetching, shows an error banner. |
| `usePhotoVaultData` + `PhotoVaultManagerModal` | Deleted straight from the browser (unscoped) then removed the photo from the UI regardless. | API-only, removes the photo only when the server confirms, shows the error. |
| `WalletRedeemPass` | A rejected redemption (not your device / rate limited / zero balance) failed silently. | Shows why. |
| `RoomCategoryModal` delete | Two sequential deletes, UI state updated even if they failed. | Stops at the first failure and reports it. |
| `useWalletWorkspace` plan switch | Ignored the result (e.g. 403 while a payment is pending). | Shows the error in `WalletWorkspace`. |
| `useGuestOrderPolling` | The "already polling" guards were plain objects recreated every render, not refs, so they never held and polls could overlap (extra load on the API). | Real `useRef` guards. |
| `useKitchenTickets` item tick | Sent the PATCH from inside a `setState` updater (React may run updaters twice, so it could send twice) and ignored HTTP errors. | One request outside the updater; refetches on failure. |

## Pipeline tests (`tests/pipelines`, 6 files, 51 tests; whole suite 144 tests)
All run against real route handlers and services using an in-memory Supabase fake (`lib/testing/fake-supabase.ts`) with failure injection and unique constraints. They need no database and no credentials.

| Pipeline | Covered |
|---|---|
| Room checkout | Two-step flow (release then pay); double submit; **two simultaneous checkouts** (one wins, one invoice, one fee); invalid tender; failure before/after the invoice is written leaves a retryable state. |
| Order completion | Stock deduction + fee exactly once under concurrent and repeated completion; COMPLETED to SERVED still records the status; failed deduction is reported; cross-venue order untouched. |
| Wallet redemption | Create/reuse/expire; code collision retry without overwriting another guest; verify only for the right venue; expired, redeemed, cancelled, insufficient balance. |
| Guest wallet ownership | No secret shows nothing; first device claims; other device sees empty wallet and `handle_taken`; owner keeps access; names are not identifiers; redemption needs ownership; fails closed (503). |
| Social lobby | Venue isolation; input bounds; DB failure is reported; only the invited table can accept; chat limited to participants of a venue-owned chat. |
| Guest order | Prices come from the venue's catalog (client price ignored, other venues' items get no price); quantity clamp; negative wallet 402; unreadable billing 503; 15/min rate limit; duplicate key returns the original; rejected/failed order mapping; add-on detection. |

Mutation checks: removing the double-deduction guard fails 2 tests; removing the "release room only if still OCCUPIED" condition originally failed **none** (only sequential double-clicks were tested), so a concurrency test was added and the missing cleanup of the losing request's duplicate invoice was fixed.

Bugs the tests caught while being written: `COMPLETED -> SERVED` silently did nothing after the double-deduction fix; handle claims were case-insensitive but wallet lookups were case-sensitive.

### Not verifiable without a real database
These live in Postgres functions and need an integration run against a **separate test Supabase project**: `submit_guest_order_atomic` (order, KOT, table-session write), `execute_atomic_bill_settlement` (cashback and redemption ledger), `update_kot_status`, `approve_topup_request`, `deduct_venue_wallet_credits`, and Realtime delivery to the kitchen screen. The suite stubs these and tests the contract around them; it does not prove their SQL.

## Test isolation
`vitest.config.ts` no longer loads `.env.local`; tests get inert placeholder credentials. Two existing tests (`venue-guard.test.ts`, `business-resolver.test.ts`) were silently querying the live Supabase project (one wrote junk rows); both now use mocks or the fake.

## CI/CD (there was none)
| File | Purpose |
|---|---|
| `.github/workflows/ci.yml` | On every PR and push to `main`: typecheck, lint, tests, migration check, production build. A second job on `main` runs the strict environment check against the `production` environment's secrets. |
| `vercel.json` | Build command `npm run build:release` = verify env, run tests, `next build`. A failing test or incomplete production env now fails the deployment. (Vercel previously ran only the build.) |
| `scripts/verify-env.mjs` | Production (`VERCEL_ENV=production` or `VERIFY_ENV_STRICT=1`) fails when `SUPABASE_SERVICE_ROLE_KEY`, Redis, or `RATE_LIMIT_REQUIRE_REDIS=1` are missing, when the service key equals the anon key or its JWT role isn't `service_role`, or when a `NEXT_PUBLIC_*` name looks like a secret. Previews only warn. |
| `scripts/check-migrations.mjs` | Fails on malformed or duplicate migration versions. |
| `npm run verify` | Local one-shot: typecheck, lint, tests, migration check. |

Setup you must do: add the `production` environment and its secrets in GitHub; set the same variables in Vercel's Production environment. Without them the production build now fails by design.

## Verification run
- `npm run typecheck`: clean. `next lint`: 0 errors. `npm test`: 144 passed (23 files), with no credentials and no network.
- `next build` (production, placeholder env, throwaway output dir): compiled, types valid, static pages generated.
- The GitHub workflow YAML and `vercel.json` were parsed and validated, but the workflow itself has not run on GitHub and the Vercel build command has not run on Vercel.
