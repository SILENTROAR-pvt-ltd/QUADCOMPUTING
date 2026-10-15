# QC hotfix protocol and guardrails

Written 15 Oct 2026, launch day. Use this when a venue reports a live bug. Everything here refers to files that exist in this repo.

## The three paths that must keep working
1. Guest scan, cart, place order: `components/guest/menu/hooks/useGuestOrderDispatch.ts`, `app/api/guest/order/route.ts`, `lib/services/guest-order/submit-order.service.ts`, DB function `submit_guest_order_atomic`.
2. Kitchen ticket and status: `app/api/host/orders/update-status/route.ts`, the kitchen workspace, realtime plus polling.
3. Cashier settlement and receipt: the table bill and session settlement routes, `lib/services/analytics/z-report*`.

## Guardrails (state of the code on 15 Oct, not aspirations)
| Guardrail | State |
|---|---|
| A duplicate tap or retry never makes a second order | Done: the guest app sends one `idempotency_key` per cart attempt; the server checks it in the database and again inside the atomic function. In-memory fallback now keys on a content hash. Needs migration `20261014000002` applied. |
| A dish switched off by the host cannot be ordered from a stale menu | Done 15 Oct: `submit-order.service.ts` rejects `is_available = false` with a 400 that names the dish. |
| Auxiliary failures (fees, stock deduction) cannot block the order or the status change | Done: fee guard and recipe-stock deduction sit in their own try/catch and only log. |
| A crash in one host screen does not blank the dashboard | Done: `WorkspaceErrorBoundary` around every host view, reports to Sentry. |
| Errors never leak database text to users | Done: `lib/utils/safe-message.ts` on the API routes. |
| Public reads are rate limited per venue | Done: menu, catalog, order status, session status. |
| Request bodies validated by a schema (Zod) | **Not done.** Routes validate by hand and are covered by tests. Move to Zod route by route after launch, never in bulk during a live fix. |
| Feature flags for new operational features | **Not done.** Add a flag with any new money-touching feature (discounts, loyalty redemption, auto-print). |
| Unknown item id on a guest order | **Open:** an id not found in the catalog is priced at 0 and named "Curated Dish". Needs a decision on legacy callers before it is rejected. |
| Host order creation (`/api/host/orders/create`) has no idempotency key | **Open:** a double-click at the till could make two bills. Add a client key and reuse the guest pattern. |

## Rules for any change to the three paths
- A side effect (SMS, analytics, loyalty, fees) is wrapped so that its failure is logged and swallowed. The order, the status change and the settlement are the only things allowed to return an error to the user.
- A new feature that touches money ships behind an environment flag, off by default, turned on per venue.
- The three paths do not import each other's helpers. Shared code lives in `lib/`.

## Emergency fix procedure
1. **Reproduce and isolate.** Is it UI only, network, or database? Check Sentry for the event, and the Vercel function log for the route.
2. **Smallest possible fix.** Change only the failing condition (a null check, a fallback). No refactor, no restyling, no dependency bumps.
3. **Gates, all must pass:**
   ```
   npx tsc --noEmit
   npx next lint --max-warnings=0
   npx vitest run
   ```
   Add a test that fails before the fix and passes after.
4. **Deploy.** Branch `hotfix/<short-description>`, open a pull request, let the Vercel preview build, check the failing flow on the preview, merge.
5. **Rollback.** If anything gets worse, use Vercel, Deployments, previous deployment, Promote to Production. A database migration is not rolled back by this: never ship a destructive migration inside a hotfix.
6. **Afterwards.** Write one line in this file under "Incidents": date, venue, cause, fix.

## Incidents
(none yet)
