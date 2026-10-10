# 02 Inventory & LOC

This report outlines the codebase volume, root clutter, and test coverage.

## Top Level Folders
| Folder | Files | Total LOC | Code LOC |
|---|---|---|---|
| .claude | 2 | 13 | 12 |
| ROOT | 54 | 11352 | 10606 |
| app | 76 | 8031 | 6815 |
| audit-pack | 13 | 21849 | 18117 |
| components | 351 | 36872 | 33236 |
| lib | 126 | 10266 | 8553 |
| public | 4 | 16219 | 15993 |
| scratch | 30 | 8732 | 8089 |
| scripts | 14 | 1693 | 1380 |
| supabase | 65 | 4609 | 4017 |
| types | 9 | 423 | 378 |
| utils | 1 | 2 | 1 |

## Component Size Violations (> 150 LOC)
Our rule: components < 90 LOC wherever possible. Violations count: 67
- components/kitchen/KitchenBoard.tsx: 599 LOC
- components/host/workspaces/catalog/components/PhotoVaultIngestForm.tsx: 424 LOC
- components/host/workspaces/billing/controls/POSCatalogGrid.tsx: 369 LOC
- components/guest/menu/CartReviewModal.tsx: 311 LOC
- components/host/workspaces/accommodations/checkin/useRoomCheckInState.ts: 296 LOC
- components/host/workspaces/billing/hooks/usePOSCart.ts: 293 LOC
- components/host/workspaces/accommodations/POSPaymentSettlementModal.tsx: 292 LOC
- components/host/workspaces/catalog/services/ServiceIngestForm.tsx: 291 LOC
- components/guest/lobby/useGuestLobbyRealtime.ts: 284 LOC
- components/guest/lobby/useSocialFeed.ts: 278 LOC
- components/host/workspaces/catalog/service/ServiceEditForm.tsx: 270 LOC
- components/guest/lobby/VenueReviewPortal.tsx: 269 LOC
- components/host/workspaces/accommodations/EditRoomModal.tsx: 269 LOC
- components/host/onboarding/OnboardingStepComponents.tsx: 268 LOC
- components/guest/menu/DiningFeed.tsx: 267 LOC
- components/host/workspaces/accommodations/ledger/printStayInvoice.ts: 265 LOC
- components/guest/lobby/VenueLiveOffers.tsx: 263 LOC
- components/host/ControlCenterHeader.tsx: 261 LOC
- components/host/workspaces/catalog/AiIngestModal.tsx: 259 LOC
- components/shared/receipt/ThermalReceiptView.tsx: 259 LOC
- ... and 47 more.

## Root Clutter
| File | Total LOC | Recommendation |
|---|---|---|
| .env.local | 5 | KEEP |
| .eslintrc.json | 4 | JUDGMENT: ARCHIVE |
| architecture.md | 200 | JUDGMENT: ARCHIVE |
| audit-api-backend.md | 86 | ARCHIVE |
| audit-auth-permissions.md | 104 | ARCHIVE |
| audit-availability-recovery.md | 80 | ARCHIVE |
| audit-caching-cdn.md | 85 | ARCHIVE |
| audit-cicd-git.md | 88 | ARCHIVE |
| audit-database-storage.md | 118 | ARCHIVE |
| audit-error-logging.md | 100 | ARCHIVE |
| audit-frontend.md | 89 | ARCHIVE |
| audit-hosting-deployment.md | 67 | ARCHIVE |
| audit-load-scaling.md | 78 | ARCHIVE |
| audit-rate-limiting.md | 87 | ARCHIVE |
| audit-security-rls.md | 94 | ARCHIVE |
| check_db.js | 31 | ARCHIVE |
| clear-test-bill.js | 16 | ARCHIVE |
| design.md | 108 | JUDGMENT: ARCHIVE |
| e2e-complex-pipeline-stress-test.js | 97 | JUDGMENT: ARCHIVE |
| e2e-pipeline-audit.js | 137 | JUDGMENT: ARCHIVE |
| enterprise-hyper-stress-test.js | 95 | JUDGMENT: ARCHIVE |
| extract-log.js | 16 | JUDGMENT: ARCHIVE |
| extract-recent.js | 13 | JUDGMENT: ARCHIVE |
| full-ecosystem-a-to-z-audit.js | 95 | JUDGMENT: ARCHIVE |
| grep.cmd | 3 | JUDGMENT: ARCHIVE |
| memory.md | 75 | JUDGMENT: ARCHIVE |
| middleware.ts | 110 | KEEP |
| multi-table-swarm-audit.js | 118 | JUDGMENT: ARCHIVE |
| next-env.d.ts | 6 | JUDGMENT: ARCHIVE |
| next.config.mjs | 9 | KEEP |
| package-lock.json | 8224 | KEEP |
| package.json | 48 | KEEP |
| phases.md | 57 | JUDGMENT: ARCHIVE |
| postcss.config.mjs | 9 | KEEP |
| prd.md | 60 | JUDGMENT: ARCHIVE |
| rules.md | 87 | JUDGMENT: ARCHIVE |
| table-isolation-audit.js | 95 | JUDGMENT: ARCHIVE |
| tailwind.config.ts | 25 | KEEP |
| test-add-room.mjs | 67 | ARCHIVE |
| test-all-interfaces.js | 72 | ARCHIVE |
| test-constraint-2.js | 28 | ARCHIVE |
| test-constraint.js | 28 | ARCHIVE |
| test-fetch.js | 10 | ARCHIVE |
| test-fetch.mjs | 8 | ARCHIVE |
| test-ledger-insert.js | 26 | ARCHIVE |
| test-query.js | 15 | ARCHIVE |
| test-room-insert.js | 60 | ARCHIVE |
| test-supabase.mjs | 18 | ARCHIVE |
| test-tables.mjs | 18 | ARCHIVE |
| test-wallet-paygo-flow.js | 105 | ARCHIVE |
| tsconfig.json | 22 | KEEP |
| tsconfig.tsbuildinfo | 1 | JUDGMENT: ARCHIVE |
| vitest.config.ts | 17 | KEEP |

## Dead Code Candidates
Files never imported (excluding entrypoints):
- app/host/control-center/error.tsx
- app/host/control-center/loading.tsx
- check_db.js
- clear-test-bill.js
- components/guest/GlobalLobbyFeed.tsx
- components/guest/lobby/lobby-realtime.service.ts
- components/guest/menu/CategoryNav.tsx
- components/guest/menu/OrderSummaryBar.tsx
- components/guest/menu/OrderSummaryDrawer.tsx
- components/guest/menu/OrderTrackingModal.tsx
- components/guest/menu/tracker/TrackerActions.tsx
- components/guest/menu/tracker/TrackerStatusCallout.tsx
- components/guest/menu/useGuestMenuController.ts
- components/guest/menu/VenueServicesDrawer.tsx
- components/host/AddFoodDrawer.tsx
- components/host/AddRoomDrawer.tsx
- components/host/ControlCenterSidebar.tsx
- components/host/DrawerHost.tsx
- components/host/EditProfileDrawer.tsx
- components/host/onboarding/OnboardingStepComponents.tsx
- components/host/wallet/AdminTopupReviewModal.tsx
- components/host/wallet/WalletWorkspace.tsx
- components/host/workspaces/accommodations/ledger/printStayInvoice.ts
- components/host/workspaces/accommodations/PastStayInvoiceModal.tsx
- components/host/workspaces/billing/components/BillRequestBanner.tsx
- components/host/workspaces/billing/POSLockModal.tsx
- components/host/workspaces/billing/PrintableInvoiceReceipt.tsx
- components/host/workspaces/catalog/PhotoVaultManagerModal.tsx
- components/host/workspaces/kitchen/ChefTicketCard.tsx
- components/host/workspaces/kitchen/hooks/useKitchenAudio.ts

## Vitest Summary
```text

 [32m✓[39m lib/utils/kitchen.test.ts [2m ([22m[2m4 tests[22m[2m)[22m[90m 26[2mms[22m[39m
 [32m✓[39m lib/middleware/rate-limiter.test.ts [2m ([22m[2m4 tests[22m[2m)[22m[90m 98[2mms[22m[39m
 [32m✓[39m lib/utils/table-isolation.test.ts [2m ([22m[2m3 tests[22m[2m)[22m[90m 16[2mms[22m[39m
 [32m✓[39m lib/utils/qr-session.test.ts [2m ([22m[2m3 tests[22m[2m)[22m[90m 13[2mms[22m[39m
 [32m✓[39m lib/middleware/error-handler.test.ts [2m ([22m[2m5 tests[22m[2m)[22m[90m 33[2mms[22m[39m
[90mstdout[2m | lib/services/billing/venue-guard.test.ts[2m > [22m[2mPHASE 2B: Subscription Billing & Venue Guard[2m > [22m[2mRULE (b): Idempotent Platform Fee Deduction[2m > [22m[2mdeducts platform fee with idempotency key referenceId exactly once[22m[39m
[FeeGuard Executed] {
  venueId: [32m'venue-fee-test'[39m,
  actionType: [32m'bill_generate'[39m,
  invoiceRef: [32m'SETTLE_order-abc-123'[39m,
  cost: [33m3[39m,
  currentBalance: [33m150[39m,
  planTier: [32m'pay_as_you_go'[39m
}

 [32m✓[39m lib/utils/completion.test.ts [2m ([22m[2m2 tests[22m[2m)[22m[90m 8[2mms[22m[39m
[90mstdout[2m | lib/services/billing/venue-guard.test.ts[2m > [22m[2mPHASE 2B: Subscription Billing & Venue Guard[2m > [22m[2mRULE (b): Idempotent Platform Fee Deduction[2m > [22m[2mdeducts platform fee with idempotency key referenceId exactly once[22m[39m
<empty line>
[90mstdout[2m | lib/services/billing/venue-guard.test.ts[2m > [22m[2mPHASE 2B: Subscription Billing & Venue Guard[2m > [22m[2mRULE (b): Idempotent Platform Fee Deduction[2m > [22m[2mdeducts platform fee with idempotency key referenceId exactly once[22m[39m
<empty line>
 [32m✓[39m lib/services/billing/venue-guard.test.ts [2m ([22m[2m5 tests[22m[2m)[22m[33m 1260[2mms[22m[39m
 [32m✓[39m lib/services/guest-order/business-resolver.test.ts [2m ([22m[2m4 tests[22m[2m)[22m[33m 788[2mms[22m[39m

[2m Test Files [22m [1m[32m15 passed[39m[22m[90m (15)[39m
[2m      Tests [22m [1m[32m73 passed[39m[22m[90m (73)[39m
[2m   Start at [22m 20:52:21
[2m   Duration [22m 3.34s[2m (transform 1.23s, setup 4ms, collect 3.36s, tests 2.48s, environment 6ms, prepare 5.15s)[22m


```
