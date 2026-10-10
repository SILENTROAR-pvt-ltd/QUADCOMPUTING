# PART B — TIER 3 CODE EXTRACTION (Project Structure, Configs & Doc Excerpts)

---

## 1. Directory Tree (Depth: 4, excluding node_modules, .next, .git)

```
.
├── -s
├── .env.local
├── .eslintrc.json
├── .gitignore
├── app/
│   ├── (guest)/
│   │   ├── menu/
│   │   │   ├── page.tsx
│   ├── admin/
│   │   ├── topup-desk/
│   │   │   ├── page.tsx
│   ├── api/
│   │   ├── admin/
│   │   │   ├── reset-balance/
│   │   │   ├── topup-requests/
│   │   ├── guest/
│   │   │   ├── call-staff/
│   │   │   ├── lobby/
│   │   │   ├── menu/
│   │   │   ├── onboard/
│   │   │   ├── order/
│   │   │   ├── reviews/
│   │   │   ├── session/
│   │   │   ├── wallet/
│   │   ├── host/
│   │   │   ├── accommodations/
│   │   │   ├── analytics/
│   │   │   ├── catalog/
│   │   │   ├── expenses/
│   │   │   ├── inventory/
│   │   │   ├── kitchen/
│   │   │   ├── orders/
│   │   │   ├── profile/
│   │   │   ├── promotions/
│   │   │   ├── provision/
│   │   │   ├── security/
│   │   │   ├── sessions/
│   │   │   ├── staff/
│   │   │   ├── tables/
│   │   │   ├── wallet/
│   │   ├── orders/
│   │   │   ├── route.ts
│   │   ├── tables/
│   │   │   ├── route.ts
│   │   ├── venue/
│   │   │   ├── offers/
│   │   │   ├── photo-vault/
│   ├── auth/
│   │   ├── host/
│   │   │   ├── page.tsx
│   ├── globals.css
│   ├── guest/
│   │   ├── lobby/
│   │   │   ├── page.tsx
│   │   ├── onboard/
│   │   │   ├── page.tsx
│   ├── host/
│   │   ├── control-center/
│   │   │   ├── accommodations/
│   │   │   ├── error.tsx
│   │   │   ├── loading.tsx
│   │   │   ├── page.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   ├── layout.tsx
│   ├── layout.tsx
│   ├── onboarding/
│   │   ├── guest/
│   │   │   ├── page.tsx
│   │   ├── host/
│   │   │   ├── page.tsx
│   ├── page.tsx
├── architecture.md
├── audit-api-backend.md
├── audit-auth-permissions.md
├── audit-availability-recovery.md
├── audit-caching-cdn.md
├── audit-cicd-git.md
├── audit-database-storage.md
├── audit-error-logging.md
├── audit-frontend.md
├── audit-hosting-deployment.md
├── audit-load-scaling.md
├── audit-rate-limiting.md
├── audit-security-rls.md
├── check_db.js
├── clear-test-bill.js
├── components/
│   ├── admin/
│   │   ├── topup-desk/
│   │   │   ├── AdminTopupCard.tsx
│   │   │   ├── AdminTopupHeader.tsx
│   │   │   ├── hooks/
│   ├── common/
│   │   ├── RealtimeHealthIndicator.tsx
│   ├── guest/
│   │   ├── DynamicIslandNotification.tsx
│   │   ├── GlobalLobbyFeed.tsx
│   │   ├── PrivateChatModal.tsx
│   │   ├── TableInteractionModal.tsx
│   │   ├── lobby/
│   │   │   ├── FullPortalModal.tsx
│   │   │   ├── GlobalLobbyFeed.tsx
│   │   │   ├── GuestWalletModal.tsx
│   │   │   ├── HeroBanner.tsx
│   │   │   ├── LobbyCashbackBanner.tsx
│   │   │   ├── LobbyFeedEmpty.tsx
│   │   │   ├── LobbyFeedSkeleton.tsx
│   │   │   ├── LobbyFloatingNavigation.tsx
│   │   │   ├── LobbyUsernameModal.tsx
│   │   │   ├── LoungeComposer.tsx
│   │   │   ├── LoungeHeader.tsx
│   │   │   ├── LoungeMediaPreview.tsx
│   │   │   ├── LoungePostActions.tsx
│   │   │   ├── LoungePostCard.tsx
│   │   │   ├── LoungePostMedia.tsx
│   │   │   ├── LoungeThreadDrawer.tsx
│   │   │   ├── SocialMediaLightbox.tsx
│   │   │   ├── VaultLightboxModal.tsx
│   │   │   ├── VaultPhotoCard.tsx
│   │   │   ├── VenueLiveOffers.tsx
│   │   │   ├── VenuePhotoVault.tsx
│   │   │   ├── VenueReviewPortal.tsx
│   │   │   ├── lobby-realtime.service.ts
│   │   │   ├── lobby.constants.ts
│   │   │   ├── reviews/
│   │   │   ├── types.ts
│   │   │   ├── useGuestLobbyRealtime.ts
│   │   │   ├── useGuestWallet.ts
│   │   │   ├── useSocialFeed.ts
│   │   │   ├── useTypewriter.ts
│   │   │   ├── vault.constants.ts
│   │   │   ├── wallet/
│   │   ├── menu/
│   │   │   ├── ActiveBillView.tsx
│   │   │   ├── BeyondDiningSection.tsx
│   │   │   ├── CartReviewModal.tsx
│   │   │   ├── CategoryNav.tsx
│   │   │   ├── CustomizationDrawer.tsx
│   │   │   ├── DiningFeed.tsx
│   │   │   ├── DiningFilters.tsx
│   │   │   ├── FloatingCartBar.tsx
│   │   │   ├── GuestIdentityCard.tsx
│   │   │   ├── GuestIdentityModal.tsx
│   │   │   ├── LiveOrderTracker.tsx
│   │   │   ├── MenuHeader.tsx
│   │   │   ├── MenuModalsHost.tsx
│   │   │   ├── OrderSuccessModal.tsx
│   │   │   ├── OrderSummaryBar.tsx
│   │   │   ├── OrderSummaryDrawer.tsx
│   │   │   ├── OrderTrackingModal.tsx
│   │   │   ├── ServiceCallBar.tsx
│   │   │   ├── TrackerActions.tsx
│   │   │   ├── TrackerStatusCallout.tsx
│   │   │   ├── TrackerTimeline.tsx
│   │   │   ├── UnifiedNavigationBar.tsx
│   │   │   ├── VenueServiceModal.tsx
│   │   │   ├── VenueServicesDrawer.tsx
│   │   │   ├── VenueServicesMarquee.tsx
│   │   │   ├── customization/
│   │   │   ├── guest-identity.util.ts
│   │   │   ├── hooks/
│   │   │   ├── tracker/
│   │   │   ├── types.ts
│   │   │   ├── useGuestMenuController.ts
│   │   ├── onboard/
│   │   │   ├── GuestOnboardForm.tsx
│   ├── host/
│   │   ├── AddFoodDrawer.tsx
│   │   ├── AddRoomDrawer.tsx
│   │   ├── ControlCenterHeader.tsx
│   │   ├── ControlCenterSidebar.tsx
│   │   ├── ControlCenterWorkspace.tsx
│   │   ├── DrawerHost.tsx
│   │   ├── EditProfileDrawer.tsx
│   │   ├── HostWorkspaceHydrator.tsx
│   │   ├── ProfileHeader.tsx
│   │   ├── PropertyBranches.tsx
│   │   ├── ServiceCatalog.tsx
│   │   ├── billing/
│   │   │   ├── DynamicUpiQr.tsx
│   │   ├── charts/
│   │   │   ├── RevenueTrendChart.tsx
│   │   │   ├── revenue-chart/
│   │   ├── control-center/
│   │   │   ├── DesktopSidebar.tsx
│   │   │   ├── MobileHeaderBar.tsx
│   │   │   ├── MobileNavDrawer.tsx
│   │   │   ├── NavWorkspaceItem.tsx
│   │   │   ├── WorkspaceViewRouter.tsx
│   │   │   ├── useBillRequests.ts
│   │   │   ├── useControlCenterSecurity.ts
│   │   │   ├── usePendingKot.ts
│   │   ├── modals/
│   │   │   ├── AddPromotionModal.tsx
│   │   │   ├── AddStaffModal.tsx
│   │   │   ├── AdminGatekeeperModal.tsx
│   │   │   ├── EodZReportModal.tsx
│   │   │   ├── InventoryAuditModal.tsx
│   │   │   ├── KitchenTicketsSheet.tsx
│   │   │   ├── LogExpenseModal.tsx
│   │   │   ├── NewRawStockModal.tsx
│   │   │   ├── OrdersListSheet.tsx
│   │   │   ├── RecordAdvanceModal.tsx
│   │   │   ├── eod/
│   │   │   ├── raw-stock/
│   │   ├── onboarding/
│   │   │   ├── OnboardingStepComponents.tsx
│   │   │   ├── onboarding.constants.ts
│   │   ├── wallet/
│   │   │   ├── AdminTopupReviewItem.tsx
│   │   │   ├── AdminTopupReviewModal.tsx
│   │   │   ├── FeeScheduleBadges.tsx
│   │   │   ├── LedgerTable.tsx
│   │   │   ├── ManualTopUpModal.tsx
│   │   │   ├── OutstandingBillingSection.tsx
│   │   │   ├── PaymentVerificationBanner.tsx
│   │   │   ├── PlanCardItem.tsx
│   │   │   ├── PlanCards.tsx
│   │   │   ├── PlanSubscriptionModal.tsx
│   │   │   ├── WalletBalanceCard.tsx
│   │   │   ├── WalletEngineStrip.tsx
│   │   │   ├── WalletHeader.tsx
│   │   │   ├── WalletTopUpActions.tsx
│   │   │   ├── WalletWorkspace.tsx
│   │   │   ├── hooks/
│   │   ├── workspaces/
│   │   │   ├── AccommodationsWorkspace.tsx
│   │   │   ├── BillingWorkspace.tsx
│   │   │   ├── CatalogWorkspace.tsx
│   │   │   ├── DashboardWorkspace.tsx
│   │   │   ├── ExpensesWorkspace.tsx
│   │   │   ├── InventoryWorkspace.tsx
│   │   │   ├── KitchenWorkspace.tsx
│   │   │   ├── ProfileWorkspace.tsx
│   │   │   ├── accommodations/
│   │   │   ├── analytics/
│   │   │   ├── billing/
│   │   │   ├── catalog/
│   │   │   ├── dashboard/
│   │   │   ├── inventory/
│   │   │   ├── kitchen/
│   │   │   ├── profile/
│   ├── landing/
│   │   ├── BackgroundImage.tsx
│   │   ├── BackgroundVideo.tsx
│   ├── shared/
│   │   ├── DigitalReceipt.tsx
│   │   ├── receipt/
│   │   │   ├── ReceiptModalActions.tsx
│   │   │   ├── ThermalReceiptView.tsx
│   │   │   ├── useDigitalReceiptActions.ts
├── design.md
├── docs/
│   ├── adr/
│   │   ├── 0001-business-and-branch-model.md
│   │   ├── 0002-light-theme.md
│   │   ├── 0003-supabase-auth.md
├── e2e-complex-pipeline-stress-test.js
├── e2e-pipeline-audit.js
├── enterprise-hyper-stress-test.js
├── extract-log.js
├── extract-recent.js
├── full-ecosystem-a-to-z-audit.js
├── lib/
│   ├── lexicon.ts
│   ├── repository/
│   │   ├── host.repository.ts
│   ├── services/
│   │   ├── accommodation/
│   │   │   ├── addons.util.ts
│   │   │   ├── category-crud.service.ts
│   │   │   ├── create-category.service.ts
│   │   │   ├── update-category.service.ts
│   │   │   ├── update-rooms.util.ts
│   │   ├── accommodation.service.ts
│   │   ├── analytics/
│   │   │   ├── aggregations.util.ts
│   │   │   ├── date-range.util.ts
│   │   │   ├── fetch-data.service.ts
│   │   │   ├── order-status.util.ts
│   │   │   ├── trends-builder.util.ts
│   │   ├── analytics.service.ts
│   │   ├── api-idempotency.util.ts
│   │   ├── catalog/
│   │   │   ├── catalog-formatter.util.ts
│   │   │   ├── create-item.service.ts
│   │   │   ├── delete-item.service.ts
│   │   │   ├── fetch-catalog.service.ts
│   │   │   ├── resolve-business.util.ts
│   │   ├── catalog-delete-addon.service.ts
│   │   ├── catalog-delete.service.ts
│   │   ├── catalog.service.ts
│   │   ├── guest-order/
│   │   │   ├── active-ticket.util.ts
│   │   │   ├── find-order.util.ts
│   │   │   ├── get-order.service.ts
│   │   │   ├── kot-generator.util.ts
│   │   │   ├── order-db-sync.util.ts
│   │   │   ├── order-utils.ts
│   │   │   ├── submit-order.service.ts
│   │   ├── guest-order.service.ts
│   │   ├── guest-session/
│   │   │   ├── bill-request-event.util.ts
│   │   │   ├── get-session.service.ts
│   │   │   ├── guest-record.util.ts
│   │   │   ├── init-session-helpers.util.ts
│   │   │   ├── init-session.service.ts
│   │   │   ├── session-kot.util.ts
│   │   │   ├── session-utils.ts
│   │   │   ├── update-session.service.ts
│   │   ├── guest-session.service.ts
│   │   ├── inventory/
│   │   │   ├── recipe-deduction.service.ts
│   │   ├── kitchen/
│   │   │   ├── business-resolver.service.ts
│   │   │   ├── create-ticket.service.ts
│   │   │   ├── get-tickets.service.ts
│   │   │   ├── order-sync.util.ts
│   │   │   ├── update-ticket.service.ts
│   │   ├── kitchen.service.ts
│   │   ├── orders/
│   │   │   ├── create-order.service.ts
│   │   │   ├── order-mutation.service.ts
│   │   │   ├── order-uuid.util.ts
│   │   │   ├── recipe-deduction.service.ts
│   │   │   ├── resolve-business.util.ts
│   │   │   ├── resolve-table-id.util.ts
│   │   │   ├── room-stay-order.util.ts
│   │   ├── orders.service.ts
│   │   ├── session/
│   │   │   ├── active-sessions.service.ts
│   │   │   ├── bill-history.service.ts
│   │   │   ├── close-session-tables.util.ts
│   │   │   ├── detailed-session.service.ts
│   │   │   ├── session-entry.util.ts
│   │   │   ├── settle-orders.util.ts
│   │   │   ├── settle-session-complete.util.ts
│   │   │   ├── settle-session.service.ts
│   │   ├── session.service.ts
│   │   ├── table/
│   │   │   ├── get-tables.service.ts
│   │   │   ├── resolve-table.util.ts
│   │   │   ├── table-crud.service.ts
│   │   │   ├── table-occupancy.util.ts
│   │   │   ├── update-table.service.ts
│   │   ├── table.service.ts
│   │   ├── wallet/
│   │   │   ├── cashback-ledger.util.ts
│   │   │   ├── cashback.service.ts
│   │   │   ├── fee-guard.service.ts
│   │   │   ├── free-tier.service.ts
│   │   │   ├── redemption-store.util.ts
│   │   │   ├── redemption.service.ts
│   │   │   ├── topup-request-approval.service.ts
│   │   │   ├── topup-request-create.service.ts
│   │   │   ├── topup-request-queries.service.ts
│   │   │   ├── topup-request-rejection.service.ts
│   │   │   ├── venue-plan.service.ts
│   │   │   ├── venue-wallet.service.ts
│   │   │   ├── wallet-details.service.ts
│   │   │   ├── wallet-memory.store.ts
│   │   │   ├── wallet-provision.service.ts
│   │   │   ├── wallet-topup.service.ts
│   ├── store/
│   │   ├── active-order-store.ts
│   │   ├── cart.store.ts
│   │   ├── drawer.store.ts
│   │   ├── guest-lobby.store.ts
│   │   ├── host-workspace.store.ts
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   ├── utils/
│   │   ├── accommodations-folio.test.ts
│   │   ├── accommodations.test.ts
│   │   ├── accommodations.ts
│   │   ├── api-response.ts
│   │   ├── billing-pos.test.ts
│   │   ├── catalog-item.ts
│   │   ├── cn.ts
│   │   ├── completion.test.ts
│   │   ├── completion.ts
│   │   ├── gst.ts
│   │   ├── hostUtils.ts
│   │   ├── ids.ts
│   │   ├── inventory.test.ts
│   │   ├── kitchen.test.ts
│   │   ├── kitchen.ts
│   │   ├── kot-live-tracker.test.ts
│   │   ├── money.ts
│   │   ├── qr-session.test.ts
│   │   ├── qr-session.ts
│   │   ├── receipt-adapter.test.ts
│   │   ├── receipt-adapter.ts
│   │   ├── table-isolation.test.ts
│   │   ├── upi.ts
│   ├── validations/
│   │   ├── onboarding.ts
├── memory.md
├── middleware.ts
├── multi-table-swarm-audit.js
├── next-env.d.ts
├── next.config.mjs
├── package-lock.json
├── package.json
├── phases.md
├── postcss.config.mjs
├── prd.md
├── public/
│   ├── images/
│   │   ├── feed-bg.jpg
│   │   ├── lobby-hero.jpg
│   │   ├── neuron-structure.jpg
│   │   ├── orbit-bg.jpg
│   ├── videos/
│   │   ├── 305391.mp4
│   │   ├── onboard-bg-poster.jpg
│   │   ├── onboard-bg.mp4
│   │   ├── quad-background.mp4
├── rules.md
├── scratch/
│   ├── diag-deduction.mjs
│   ├── diag-zero-balance.mjs
│   ├── forensic-grep-results.json
│   ├── format-part-c.mjs
│   ├── generate-part-b-tier1-api.mjs
│   ├── generate-part-b-tier1-migrations.mjs
│   ├── generate-part-b-tier1-services.mjs
│   ├── generate-part-b-tier1-validators.mjs
│   ├── generate-part-b-tier2.mjs
│   ├── generate-part-b-tier3.mjs
│   ├── generate-part-d.mjs
│   ├── reset-wallet-balance.mjs
│   ├── run-forensic-greps.mjs
│   ├── stress-test-concurrency.mjs
│   ├── test-10-tables-pipeline.mjs
│   ├── test-addon-cashback-fix.mjs
│   ├── test-billing-settle-wallet-pipeline.mjs
│   ├── test-chaos-edge-cases.mjs
│   ├── test-complete-verification.mjs
│   ├── test-decoupled-topup-plan.mjs
│   ├── test-fixes-verification.mjs
│   ├── test-free-tier-pipeline.mjs
│   ├── test-production-pillars.mjs
│   ├── test-redemption-pipeline.mjs
│   ├── test-security-audit.mjs
│   ├── test-topup-approval-pipeline.mjs
├── scripts/
│   ├── seed-dashboard-data.sql
│   ├── seed-dashboard-data.ts
├── supabase/
│   ├── .temp/
│   │   ├── cli-latest
│   ├── migrations/
│   │   ├── 001_onboarding.sql
│   │   ├── 002_provisioning_foundation.sql
│   │   ├── 003_rls_policies.sql
│   │   ├── 004_catalog_and_inventory.sql
│   │   ├── 005_banking_details.sql
│   │   ├── 20260920231348_profile_personal_fields.sql
│   │   ├── 20260920234120_add_offers_accommodation.sql
│   │   ├── 20260920235832_add_catalog_metadata.sql
│   │   ├── 20260921002223_raw_inventory_ecosystem.sql
│   │   ├── 20260921003908_billing_pos_orders.sql
│   │   ├── 20260921143159_add_staff_pin.sql
│   │   ├── 20260921200700_add_staff_pin.sql
│   │   ├── 20260921201500_create_kitchen_tickets.sql
│   │   ├── 20260921204400_add_reorder_level.sql
│   │   ├── 20260921210000_recipes_and_analytics.sql
│   │   ├── 20260921220000_production_security_and_indexes.sql
│   │   ├── 20260921230600_create_promotions.sql
│   │   ├── 20260921234500_inventory_audits.sql
│   │   ├── 20260922000000_recipe_rls.sql
│   │   ├── 20260922190000_restaurant_tables_and_triggers.sql
│   │   ├── 20260922200000_extend_staff_for_pos_pin.sql
│   │   ├── 20260922210000_add_admin_pin.sql
│   │   ├── 20260922220000_ensure_staff_pin.sql
│   │   ├── 20260922230000_add_protected_modules.sql
│   │   ├── 20260925000000_staff_and_expenses.sql
│   │   ├── 20260925000001_add_staff_pin_to_businesses.sql
│   │   ├── 20260925000002_accommodations_and_rooms.sql
│   │   ├── 20260925000003_add_room_category_addons.sql
│   │   ├── 20260925000004_room_stay_logs_and_checkin.sql
│   │   ├── 20260925000005_sync_accommodations_with_pos_orders.sql
│   │   ├── 20260925000006_realtime_qr_dine_in_sessions.sql
│   │   ├── 20260925000007_guest_social_lobby.sql
│   │   ├── 20260925000008_guest_sessions_customer_id.sql
│   │   ├── 20260927000001_bill_request_history.sql
│   │   ├── 20260927000005_host_profile_sync.sql
│   │   ├── 20260929000000_reviews_and_wallets.sql
│   │   ├── 20260929000001_businesses_profile_sync.sql
│   │   ├── 20260929000002_host_security_rls.sql
│   │   ├── 20260930000001_venue_photo_vault.sql
│   │   ├── 20260930000002_tables_management_sync.sql
│   │   ├── 20260930000003_venue_subscriptions_and_wallets.sql
│   │   ├── 20260930000004_venue_outstanding_bills.sql
│   │   ├── 20260930000005_accommodations_host_security_rls.sql
│   │   ├── 20260930000006_outstanding_bills_item_types.sql
│   │   ├── 20260930000007_fix_pay_as_you_go_subscription.sql
│   │   ├── 20260930000008_venue_live_offers.sql
│   │   ├── 20260930000009_venue_topup_requests.sql
│   │   ├── 20260930000010_decouple_topup_and_plan_requests.sql
│   │   ├── 20261003000001_add_guest_identification_fields.sql
│   │   ├── 20261003000002_venue_scoped_guest_wallets.sql
│   │   ├── 20261003000003_guest_wallet_redemptions.sql
│   │   ├── 20261004000001_comprehensive_rls_and_rpc_lockdown.sql
│   │   ├── 20261004000002_rpc_security_idor_and_pgbouncer.sql
│   │   ├── 20261004000003_production_pillars_rls_and_inventory.sql
├── table-isolation-audit.js
├── tailwind.config.ts
├── test-add-room.mjs
├── test-all-interfaces.js
├── test-constraint-2.js
├── test-constraint.js
├── test-fetch.js
├── test-fetch.mjs
├── test-ledger-insert.js
├── test-query.js
├── test-room-insert.js
├── test-supabase.mjs
├── test-tables.mjs
├── test-wallet-paygo-flow.js
├── tsconfig.json
├── tsconfig.tsbuildinfo
├── types/
│   ├── accommodations.ts
│   ├── branch.ts
│   ├── catalog.ts
│   ├── completion.ts
│   ├── host.ts
│   ├── index.ts
│   ├── offers.ts
│   ├── qr-session.ts
│   ├── wallet.ts
├── utils/
│   ├── supabase/
│   │   ├── client.ts
├── videos/
│   ├── 106883-674268697.mp4
│   ├── 305391.mp4
│   ├── 8247206-hd_1920_1080_25fps.mp4
│   ├── abstract-neuron-structure-in-blue-hues-on-black-background-photo.jpg

```

---

## 2. Configuration Files & Package Metadata

### package.json
```json
{
  "name": "quad-computing",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -H 0.0.0.0 -p 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@google/genai": "^2.23.0",
    "@hookform/resolvers": "^5.9.1",
    "@supabase/ssr": "^0.12.7",
    "@supabase/supabase-js": "^2.116.0",
    "@types/canvas-confetti": "^1.9.0",
    "canvas-confetti": "^1.9.4",
    "framer-motion": "^13.4.1",
    "lucide-react": "^1.47.0",
    "next": "14.2.35",
    "qrcode.react": "^4.2.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.88.0",
    "zod": "^4.6.5",
    "zustand": "^5.0.15"
  },
  "devDependencies": {
    "@types/node": "^20.14.12",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@types/uuid": "^11.0.0",
    "@types/ws": "^8.18.1",
    "autoprefixer": "^10.4.19",
    "dotenv": "^18.0.1",
    "eslint": "^8.57.0",
    "eslint-config-next": "14.2.35",
    "postcss": "^8.4.40",
    "tailwindcss": "^3.4.7",
    "typescript": "^5.5.4",
    "uuid": "^14.0.2",
    "vitest": "^1.6.1",
    "ws": "^8.21.3"
  }
}

```

### Lockfile Metadata
- **File**: `package-lock.json`
- **Size**: 299918 bytes (~293 KB)

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", ".next/types/**/*.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}

```

### tailwind.config.ts
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        marquee: 'marquee 28s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;

```

---

## 3. Foundational Architecture Documents (First 100 Lines Each)

### architecture.md (first 100 lines)
```markdown
# System Architecture & Tech Stack

## 1. Technology Stack Specification

| Tier | Technology | Version | Purpose / Role |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | `14.2.35` | Server-rendered pages, API route handlers, client routing |
| **Language** | TypeScript | `5.5.4` | Strict static typing, interfaces, and compile-time verification |
| **UI & Styling** | Tailwind CSS + Framer Motion | `3.4.7` / `13.4.1` | Dark luxury aesthetic, micro-animations, fluid layout |
| **State Management**| Zustand + React Hooks | `5.0.15` / `18.3.1` | Local view state, cart state, optimistic updates |
| **Database & Auth** | Supabase PostgreSQL + Auth SSR | `@supabase/ssr 0.12.7` | Multi-tenant relational storage, session auth, RLS |
| **Realtime Engine** | Supabase Realtime Channels | `@supabase/supabase-js 2.116.0` | Bidirectional WebSockets for KOTs, bills, and lobby chat |
| **Validation** | Zod | `4.6.5` | Request payload validation and schema parsing |

---

## 2. Multi-Tenant Database & Security Architecture

```
                    +--------------------------------+
                    |    Client / User Request       |
                    +---------------+----------------+
                                    |
                       Bearer JWT / Session Cookie
                                    |
                                    v
                    +---------------+----------------+
                    | Supabase Postgres (PgBouncer)  |
                    +---------------+----------------+
                                    |
             +----------------------+----------------------+
             |                                             |
             v                                             v
  +--------------------------+                 +--------------------------+
  | public.get_auth_business_ids()             | Strict Row Level Security|
  | (SECURITY DEFINER STABLE)|                 | (Non-recursive check)    |
  | Resolves host + staff IDs|                 | business_id = ANY(...)   |
  +--------------------------+                 +--------------------------+
             |                                             |
             +----------------------+----------------------+
                                    |
                                    v
  +----------------------------------------------------------------------+
  | Operational Tables:                                                  |
  | orders | order_items | dine_in_sessions | guest_wallets              |
  | wallet_transactions | raw_inventory_items | operational_expenses     |
  | kitchen_tickets | staff_notifications                                |
  +----------------------------------------------------------------------+
```

### 2.1 Cached Authorization Helper Function
To avoid expensive, recursive table lookups inside RLS policies on high-volume tables, authorization is resolved via a `STABLE` `SECURITY DEFINER` function:

```sql
CREATE OR REPLACE FUNCTION public.get_auth_business_ids()
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_biz_ids uuid[];
BEGIN
    IF v_uid IS NULL THEN
        RETURN ARRAY[]::uuid[];
    END IF;

    SELECT ARRAY_AGG(DISTINCT biz_id) INTO v_biz_ids
    FROM (
        -- Host ownership
        SELECT id AS biz_id FROM public.businesses WHERE host_id = v_uid
        UNION
        -- Active staff profile linkage
        SELECT business_id AS biz_id FROM public.staff_profiles 
        WHERE (auth_user_id = v_uid OR id = v_uid) AND (status IS NULL OR status = 'ACTIVE')
    ) t;

    RETURN COALESCE(v_biz_ids, ARRAY[]::uuid[]);
END;
$$;
```

### 2.2 PgBouncer Transaction Pooling & Deadlock Safety
All atomic transactional RPC functions execute under strict local connection timeouts to prevent connection pool exhaustion and hardware locks in high-concurrency environments:

- `SET LOCAL statement_timeout = '4000ms';`
- `SET LOCAL lock_timeout = '2500ms';`

### 2.3 Automatic Parent-Key Sync Triggers
To eliminate data anomalies and allow direct indexed non-recursive RLS queries, child tables maintain direct `business_id` columns synchronized automatically via `BEFORE INSERT` triggers:
- `sync_order_item_business_id()`: Copies `business_id` from parent `public.orders` if omitted during insert.
- `sync_wallet_transaction_business_id()`: Copies `business_id` from parent `public.guest_wallets` if omitted during insert.

---

## 3. Concurrency & Idempotency Engine

Double-clicks, network flapping, and mobile browser retry bursts are neutralized through a multi-tier defense:
```

### rules.md (first 100 lines)
```markdown
# Engineering Rules, AI Guardrails & Anti-Hallucination Protocol

## 1. Core Operating Principles

This document defines the strict engineering laws and guardrails for all AI coding agents, contributors, and maintainers working within the Quad Computing codebase. Any contribution violating these rules is considered a regression and must be immediately reverted.

---

## 2. Mandatory Rules (What to Do)

### 2.1 100% Type Safety & Compiler Cleanliness
- **Zero TypeScript Errors**: Every commit or pull request must pass `npx tsc --noEmit` with **0 errors**. No `any` casting or `ts-ignore` escapes on core domain types.
- **Strict Domain Models**: Use shared interfaces in `types/` for all business entities (orders, sessions, wallet balances, KOTs).

### 2.2 Atomic Database Operations
- **Single-Transaction Integrity**: All financial mutations, order settlements, and inventory decrements must execute inside atomic PostgreSQL RPC functions (`SECURITY DEFINER`) or database transactions.
- **Timeout Protection**: All RPC functions must set local timeouts (`SET LOCAL statement_timeout = '4000ms'; SET LOCAL lock_timeout = '2500ms';`) to prevent PgBouncer transaction-mode deadlocks.

### 2.3 Strict Realtime WebSocket Memory Hygiene
- **Channel Cleanup**: Every Supabase Realtime channel subscription must explicitly invoke `supabase.removeChannel(channel)` in its `useEffect` cleanup hook or unmount lifecycle. Never use `channel.unsubscribe()` alone, as it retains the channel reference in the client runtime.
- **Single Subscription Ownership**: Components must not spawn duplicate listeners for the same table or channel scope.

### 2.4 Component Modularity (< 90 LOC Guideline)
- **High Modularity**: Modified React component files must strictly remain under **90 Lines of Code (LOC)** wherever possible.
- **Separation of Concerns**: Decompose complex views into:
  1. Pure presentational components
  2. Custom data/mutation hooks
  3. Decoupled utility/service functions in `lib/services/`

### 2.5 Standardized API Response Contracts
All API route handlers under `app/api/...` must return the standardized JSON contract defined in `lib/utils/api-response.ts`:

```typescript
// Success Contract (HTTP 200 / 201)
{
  "success": true,
  "data": { ... }
}

// Error Contract (HTTP 400 / 401 / 403 / 404 / 409 / 500)
{
  "success": false,
  "error": "Descriptive human-readable error message",
  "code": "MACHINE_READABLE_ERROR_CODE"
}
```

---

## 3. Strict Prohibitions & Anti-Hallucination Protocol (What NOT to Do)

### 3.1 No Retroactive Migration Overwrites
- **Never edit past migration files** that have already been executed in production.
- Any schema alterations, new triggers, or policy adjustments must be added as a **new, timestamped SQL migration file** in `supabase/migrations/` (e.g., `YYYYMMDDHHMMSS_description.sql`).

### 3.2 No Bypassing Row Level Security (RLS)
- Never disable RLS on any public or operational table.
- Never use the Supabase Service Role key in client-side code (`NEXT_PUBLIC_...`). The Service Role client is strictly reserved for trusted server-side background cron jobs and system triggers.
- Never perform recursive table joins inside RLS policies. Always use direct column lookups against `public.get_auth_business_ids()`.

### 3.3 No Removal of Idempotency & Debounce Wrappers
- Critical mutation endpoints (`/api/guest/order`, `/api/host/sessions`, `/api/guest/wallet/redeem`, `/api/host/wallet/redeem`) must **never** have their `withIdempotency` wrapper removed or bypassed.
- Frontend trigger buttons for settlements, order dispatches, and wallet redemptions must maintain `useRef` locks (`isSubmittingRef`, `isSettlingRef`) to prevent frantic double-taps.

### 3.4 No Fragile LocalStorage Overrides for Ground Truth
- `localStorage` must never be used as the authoritative source of truth for bill balances, session status, or KOT progress.
- Transactional state must always be fetched from and verified against the PostgreSQL database.

### 3.5 No Direct Client Mutations on Sensitive Ledgers
- Tables such as `guest_wallets`, `wallet_transactions`, and `inventory_logs` must revoke direct `INSERT`, `UPDATE`, and `DELETE` privileges from anonymous and authenticated browser clients.
- All modifications to balances or stock levels must pass through vetted `SECURITY DEFINER` RPC functions with server-side validation.

---

## 4. HTTP Status Code Discipline

| Status Code | Meaning | When to Use |
| :--- | :--- | :--- |
| `200 OK` | Success | Successful read or idempotent non-creation mutation |
| `201 Created` | Resource Created | Successful order creation or KOT generation |
| `400 Bad Request` | Invalid Input | Malformed JSON, missing required fields, negative values |
| `401 Unauthorized` | Unauthenticated | Missing or expired JWT session token |
| `403 Forbidden` | Access Denied | Authenticated user is not authorized for target `business_id` |
| `404 Not Found` | Resource Missing | Table, session, or catalog item does not exist |
| `409 Conflict` | Duplicate Submission | Rapid-fire duplicate detected by sliding-window idempotency |
| `500 Server Error` | Internal Failure | Unhandled database or runtime exception |

```

### prd.md (first 100 lines)
```markdown
# Product Requirements Document (PRD) — Hospitality & F&B Operations SaaS

## 1. Product Vision & Executive Summary

The platform is an ultra-fast, multi-tenant, offline-resilient Property & Food and Beverage (F&B) Management SaaS designed specifically for boutique hotels, heritage stays, cafes, and mountain resorts (optimized for challenging high-altitude connectivity environments like Old Manali, Himachal Pradesh).

By unifying contactless QR dining, live Kitchen Order Ticket (KOT) workflows, room stay management, automated recipe-driven inventory consumption, and a customer loyalty cashback wallet into a single real-time operational engine, the system eliminates communication delays between guests, kitchen staff, floor captains, and business owners.

---

## 2. Target Users & Core Workflows

### 2.1 Property & Cafe Owners / Hosts
- **Real-Time Revenue & Shift Auditing**: Instant visibility into total daily sales, payment breakdown (Cash, UPI, Card), discount authorizations, and net profit.
- **Operational Expense Logging**: Daily tracking of recurring and ad-hoc overheads (Rent, Utilities, Staff Advances, Maintenance) with monthly summary metrics.
- **Staff Profile & Permission Controls**: Multi-tier access management for kitchen staff, floor stewards, and front-desk managers.
- **Wallet Redemption Verification**: Host-authenticated verification of customer wallet credit redemption codes to eliminate fraud.
- **Multi-Venue / Property Management**: Granular isolation of menu catalogs, raw inventories, and order streams per business tenant.

### 2.2 Kitchen Managers & Chefs
- **Live KOT Kanban Pipeline**: Visual real-time dispatch dashboard organizing tickets into distinct status lanes: `PENDING` -> `PREPARING` / `COOKING` -> `SERVED` / `READY` -> `CANCELLED`.
- **Add-On Ticket Aggregation**: Instant visual differentiation of add-on items vs. initial orders on the same table.
- **Automated Low-Stock Alerts**: Instant notification when raw inventory ingredients cross predefined replenishment thresholds.

### 2.3 Floor Staff & Cashiers
- **Table-Side QR Session Management**: Immediate visibility of open tables, requested bills, and seated guests.
- **Split & Full Billing Settlements**: High-speed bill generation with tax calculations, custom discount provisions, and multi-mode payment settlements.
- **Fast-Finger Checkout**: Optimized POS interface built for high-throughput service during peak rush hours.

### 2.4 Guests & Diners
- **Frictionless QR Menu Browsing**: Instant web-based menu access via table QR code without requiring native mobile app downloads.
- **Real-Time Cart & Add-on Ordering**: Live order placement with instant KOT creation and table order synchronization.
- **Interactive Social Table Lobby**: Optional table-linked guest avatars, social chat, and collaborative cart viewing.
- **7% Digital Hospitality Wallet**: Automatic earning of 7% cashback on settled orders, tracked in a digital wallet redeemable on subsequent visits via a secure one-time verification code.

---

## 3. Core Feature Matrix

| Feature Module | Key Functionality | Primary Stakeholder | Security / Isolation Level |
| :--- | :--- | :--- | :--- |
| **Multi-Tenant Isolation** | Dynamic tenancy partition via `business_id` | All Users | Strict RLS with `get_auth_business_ids()` |
| **Contactless QR Ordering** | Instant cart aggregation, table-session binding | Guests | Table token validation & sliding-window idempotency |
| **Live KOT Pipeline** | Real-time Kanban with optimistic status updates | Kitchen Chefs | WebSocket channels with auto-cleanup |
| **Atomic Bill Settlement** | Complete order consolidation, payment recording | Cashier / Host | Postgres RPC `execute_atomic_bill_settlement` |
| **Recipe-Driven Stock Deduction** | Automatic ingredient decrement on order serve | Kitchen & Inventory | Atomic RPC `deduct_recipe_inventory_for_order` |
| **Low-Stock Alerting** | Automated threshold trigger into `staff_notifications` | Kitchen Manager | Database trigger + Realtime broadcast |
| **Guest Loyalty Wallet** | 7% cashback accrual & code-verified redemption | Guests & Hosts | Nonce-backed redemption pipeline & ledger |
| **Offline Resilience** | Reconnection alerts, optimistic UI with rollback | Floor Staff & Guests | Supabase Realtime health monitor + optimistic rollbacks |

---

## 4. Non-Functional Requirements & SLAs

1. **Transaction Atomicity**: 100% of financial, settlement, and stock deductions must execute inside PostgreSQL database transactions with statement timeouts not exceeding `4000ms` and lock timeouts not exceeding `2500ms`.
2. **Double-Click & Replay Protection**: Mutation endpoints must guarantee zero duplicate orders or double-deductions through a 2,000ms sliding-window idempotency layer.
3. **Low-Latency Realtime Synchronization**: KOT ticket dispatch and table bill status updates must propagate across WebSocket clients in `< 350ms` under normal network conditions.
4. **Resilience in Unstable Networks**: The frontend must gracefully handle temporary internet disconnections without data corruption, providing optimistic UI updates with automatic rollback if server writes fail.
5. **Type Safety & Code Integrity**: Zero TypeScript errors allowed (`npx tsc --noEmit` must pass with 0 errors) across the entire codebase.

```

### phases.md (first 100 lines)
```markdown
# Milestone Tracking & Execution Roadmap (Phases)

## Overview & Progression Status

| Phase | Title | Focus Area | Status |
| :--- | :--- | :--- | :--- |
| **Phase 1** | Foundation & Core Tenancy | DB Schema, Multi-Tenant Partitions, Auth Setup | **COMPLETED** |
| **Phase 2** | Guest Experience & Live KOT | QR Ordering, Table Sessions, Realtime Kitchen Kanban | **COMPLETED** |
| **Phase 3** | Backoffice Billing & Loyalty | Point of Sale, 7% Wallet Cashback, QR Redemptions | **COMPLETED** |
| **Phase 4** | Security Hardening & Concurrency | IDOR Elimination, PgBouncer Timeouts, Idempotency | **COMPLETED** |
| **Phase 5** | Inventory Automation & Resilience | Recipe Stock Deduction, Low-Stock Alerts, Optimistic UI | **COMPLETED** |
| **Phase 6** | Enterprise Scale & Integrations | Multi-Property Franchises, Advanced BI, Payment Gateways | **PLANNED** |

---

## Detailed Phase Breakdown

### Phase 1: Foundation & Core Tenancy (Completed)
- [x] Initialized Next.js 14 App Router project with TypeScript strict mode and Tailwind CSS.
- [x] Provisioned Supabase PostgreSQL schema with core models: `businesses`, `staff_profiles`, `catalog_items`, and `restaurant_tables`.
- [x] Established multi-tenant foreign key hierarchies linking all operational models to `businesses(id)`.
- [x] Configured Supabase Auth with SSR cookie handling (`@supabase/ssr`).

### Phase 2: Guest Experience & Live KOT (Completed)
- [x] Built contactless QR menu browser with category filtering, dietary tags, and image showcases.
- [x] Created `dine_in_sessions` table for binding guest devices to physical table numbers without mandatory app downloads.
- [x] Implemented Add-on Order aggregation: subsequent orders from the same table append items to the active master bill.
- [x] Developed real-time Kitchen Order Ticket (KOT) Kanban with visual status progression (`PENDING` -> `PREPARING` -> `READY` / `SERVED`).
- [x] Launched real-time table lobby feature for collaborative order viewing and table-linked guest avatars.

### Phase 3: Backoffice Billing & Loyalty (Completed)
- [x] Engineered Host Point-of-Sale (POS) and Billing Workspace for instantaneous table checkout.
- [x] Implemented Digital Hospitality Wallet awarding guests 7% cashback on settled orders.
- [x] Built one-time alphanumeric code redemption verification flow for secure wallet balance usage at checkout.
- [x] Created immutable ledger table `wallet_transactions` tracking every cashback credit and redemption debit.
- [x] Developed operational expenses ledger with category classifications (Rent, Utilities, Staff Advances).

### Phase 4: Security Hardening & Concurrency (Completed)
- [x] **RPC IDOR Lockdown**: Refactored `execute_atomic_bill_settlement` and `deduct_venue_wallet_credits` to strictly authenticate callers against business ownership and session cookies.
- [x] **PgBouncer Pooling Resilience**: Added `SET LOCAL statement_timeout = '4000ms'` and `SET LOCAL lock_timeout = '2500ms'` inside all critical database RPCs.
- [x] **Sliding-Window Idempotency**: Deployed `withIdempotency` utility (2,000ms sliding window) across all mutation endpoints (`/api/guest/order`, `/api/host/sessions`, `/api/guest/wallet/redeem`, `/api/host/wallet/redeem`).
- [x] **WebSocket Memory Leak Elimination**: Replaced legacy `unsubscribe()` calls with `void supabase.removeChannel(channel)` on component unmount across all realtime hooks.
- [x] **Stress Testing Verification**: Executed 100-request simultaneous swarm simulation (`scratch/stress-test-concurrency.mjs`) achieving 100% success with zero deadlocks.

### Phase 5: Inventory Automation & Resilience (Completed)
- [x] **Recipe-Driven Stock Deduction**: Implemented atomic PostgreSQL function `deduct_recipe_inventory_for_order(uuid)` that computes recipe ingredient quantities and decrements `raw_inventory_items.current_stock` using `GREATEST(0, current_stock - qty)`.
- [x] **Automated Low-Stock Alerting**: Auto-generates low-stock notifications in `staff_notifications` whenever an ingredient's stock drops below its defined threshold.
- [x] **Optimistic UI with Rollback**: Implemented optimistic ticket state changes in `useKitchenStatusUpdate` with automatic rollback and toast notifications on network or server error.
- [x] **Realtime Health Monitoring**: Integrated `RealtimeHealthIndicator` in `app/layout.tsx` to notify users of WebSocket reconnections.
- [x] **Pillar 1 RLS Overhaul**: Created cached helper `public.get_auth_business_ids()` (`SECURITY DEFINER STABLE`) and applied strict non-recursive RLS policies across all 8 operational tables.

### Phase 6: Enterprise Scale & Integrations (Pending / Next Up)
- [ ] **Payment Gateway Webhooks**: Seamless UPI, Credit Card, and Netbanking processing via Razorpay / Cashfree webhooks with automated bill settlement.
- [ ] **Multi-Property Franchise Analytics**: Consolidated revenue, inventory cost of goods sold (COGS), and labor performance reports across multiple venues under a single host account.
- [ ] **Automated Purchase Order Generation**: Vendor integration for 1-click PO creation when raw inventory items trigger low-stock alerts.
- [ ] **Offline-First PWA Sync**: Service Worker caching and background IndexedDB sync for full offline POS operation during complete internet outages.

```

### memory.md (first 100 lines)
```markdown
# Memory Ledger & Active Component Map

## 1. System State Ledger

- **Last Audit / Verification**: 2026-10-04 (Pillars 1–5 Hardening & Zero-Error Certification).
- **TypeScript Health**: `0 errors` verified via `npx tsc --noEmit`.
- **Concurrency Test Status**: 100 concurrent requests verified with 0 deadlocks via `scratch/stress-test-concurrency.mjs`.
- **Database RLS & Schema Status**: Strict non-recursive RLS enforced on all 8 operational tables with automated `business_id` parent sync triggers.

---

## 2. Active Components & Service Ledger

### 2.1 API Route Handlers (`app/api/`)
| Route | Method | Idempotency Window | Response Contract | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `/api/guest/order` | POST | 2,000ms | Standard `{ success, data }` | Guest order placement & KOT generation |
| `/api/host/sessions` | POST / PATCH | 2,000ms | Standard `{ success, data }` | Table session open, update, and bill settlement |
| `/api/guest/wallet/redeem`| POST | 2,000ms | Standard `{ success, data }` | Issues one-time alphanumeric redemption code |
| `/api/host/wallet/redeem` | POST | 2,000ms | Standard `{ success, data }` | Verifies and applies redemption code at checkout |
| `/api/host/kitchen/tickets`| PATCH | None | Standard `{ success, data }` | Updates KOT status & triggers inventory deduction |
| `/api/venue/offers` | GET / POST | None | Standard `{ success, data }` | Manages live promotional venue discounts |

### 2.2 Core Application Services (`lib/services/`)
- `lib/services/inventory/recipe-deduction.service.ts`: Executes recipe ingredient lookups and stock decrements via atomic RPC `deduct_recipe_inventory_for_order` with fallback.
- `lib/services/session/settle-session.service.ts`: Orchestrates complete table checkout, bill settlement, wallet 7% cashback award, and inventory deduction.
- `lib/services/guest-order/submit-order.service.ts`: Validates guest order payloads, resolves active master orders, formats line items, and dispatches KOTs.
- `lib/services/guest-order/order-db-sync.util.ts`: Persists order items with explicit `business_id` and links master order records to active table sessions.
- `lib/services/api-idempotency.util.ts`: High-performance sliding-window idempotency cache (TTL: 2,000ms) with memory cleanup.
- `lib/utils/api-response.ts`: Factory functions `apiSuccess(data, status)` and `apiError(message, status, code)` ensuring uniform API contracts.

### 2.3 Resilient Frontend Components & Realtime Hooks
- `components/common/RealtimeHealthIndicator.tsx`: Ambient connection banner alerting users when WebSocket sync drops or reconnects.
- `components/host/workspaces/kitchen/hooks/useKitchenStatusUpdate.ts`: Optimistic UI Kanban handler with automatic state rollback on network or server error.
- `components/guest/lobby/useGuestLobbyRealtime.ts`: Real-time table lobby synchronization with strict channel unmount cleanup (`supabase.removeChannel`).
- `components/host/workspaces/billing/hooks/useBillingSettlement.ts`: Host POS checkout hook with `isSettlingRef` lock and idempotency keys.
- `components/guest/menu/hooks/useGuestOrderDispatch.ts`: Guest menu ordering hook with `isSubmittingRef` lock.

---

## 3. Database Migration History & Execution Sequence

```
supabase/migrations/
├── 20260921002223_raw_inventory_ecosystem.sql          # raw_inventory_items & inventory_logs
├── 20260921003908_billing_pos_orders.sql               # master orders table
├── 20260921201500_create_kitchen_tickets.sql           # kitchen_tickets table & indexes
├── 20260921210000_recipes_and_analytics.sql           # recipe_ingredients table & deduction RPC
├── 20260925000000_staff_and_expenses.sql               # staff_profiles & operational_expenses
├── 20260925000006_realtime_qr_dine_in_sessions.sql     # dine_in_sessions & order_items
├── 20260929000000_reviews_and_wallets.sql              # guest_wallets & wallet_transactions
├── 20261003000002_venue_scoped_guest_wallets.sql       # Cafe/venue scoping for wallets
├── 20261003000003_guest_wallet_redemptions.sql         # wallet_redemptions verification table
├── 20261004000001_comprehensive_rls_and_rpc_lockdown.sql # Baseline RLS lockdown & client mutation revokes
├── 20261004000002_rpc_security_idor_and_pgbouncer.sql  # IDOR ownership checks & statement timeouts
└── 20261004000003_production_pillars_rls_and_inventory.sql # Pillar 1 RLS overhaul & Pillar 4 stock deduction
```

---

## 4. Key Architectural Lessons & Historical Gotchas

1. **Postgres Error `42703` (Undefined Column)**:
   - *Problem*: `order_items` and `wallet_transactions` originally lacked `business_id` columns, causing RLS policy creation to crash.
   - *Resolution*: Always include pre-flight `ALTER TABLE ... ADD COLUMN IF NOT EXISTS business_id` and `BEFORE INSERT` sync triggers before applying RLS policies on child tables.
2. **Postgres Error `42883` (Undefined Function on Revoke)**:
   - *Problem*: Running `REVOKE EXECUTE ON FUNCTION` before function creation or without exact argument parameter types fails.
   - *Resolution*: Define the function first, then wrap `REVOKE`/`GRANT` statements inside `DO $$ BEGIN ... EXCEPTION WHEN OTHERS THEN NULL; END $$;` blocks with full parameter signatures.
3. **Supabase Realtime Channel Memory Leaks**:
   - *Problem*: In Supabase JS v2, calling `channel.unsubscribe()` stops event delivery but keeps the channel allocated in the client instance.
   - *Resolution*: Always call `void supabase.removeChannel(channel)` in component unmount cleanups.
4. **TypeScript Object Duplicate Key Error `TS2783`**:
   - *Problem*: Spreading `{ success: true, data: result, ...result }` causes duplicate property errors if `result` already contains `success`.
   - *Resolution*: Use `{ ...result, data: result }` or explicitly destructure properties.

```

### design.md (first 100 lines)
```markdown
# Visual Design System & Aesthetic Directives

## 1. Aesthetic Philosophy: Dark Editorial Luxury

The Quad Computing visual interface is built upon a **Dark Luxury & Old-Money Hospitality** design language. Rather than presenting a utilitarian, cluttered POS interface or a generic SaaS dashboard, the visual experience evokes the tactile, calm, and prestigious atmosphere of a bespoke mountain retreat, private member's lounge, or high-end boutique hotel.

### Core Visual Tenets
- **Deep Obsidian Foundations**: Interfaces utilize rich, layered blacks and slate grays rather than washed-out grays or harsh pure blacks.
- **Warm Amber & Muted Gold Radiance**: Accents mimic warm candlelight, aged brass, and high-altitude fireside warmth.
- **Editorial Typography**: Typographic hierarchies prioritize razor-sharp clarity, ample tracking for uppercase badges, and deliberate weight contrasts.
- **Micro-Delight & Tactile Weight**: Subtle borders, soft radial ambient glows, and fluid spring animations convey a physical sense of craftsmanship.

---

## 2. Master Color Palette & Design Tokens

### 2.1 Backgrounds & Surfaces
```css
/* Deepest ground for app root & modal backdrops */
--bg-void: #09090b;

/* Primary workspace & container surface */
--bg-surface-dark: #121215;

/* Elevated cards, dropdown panels, and floating drawers */
--bg-card: #18181b;

/* Hover states and active selections */
--bg-card-hover: #222227;

/* Subtle hairline borders and dividers */
--border-subtle: #27272a;
--border-highlight: #3f3f46;
```

### 2.2 Brand Accents & Status Indicators
```css
/* Primary luxury brand gold / amber */
--accent-amber-500: #f59e0b;
--accent-amber-600: #d97706;
--accent-amber-glow: rgba(245, 158, 11, 0.15);

/* Success, cashback earnings & settled states */
--status-success: #10b981;
--status-success-bg: rgba(16, 185, 129, 0.12);

/* Warning, low-stock threshold triggers & pending alerts */
--status-warning: #f59e0b;
--status-warning-bg: rgba(245, 158, 11, 0.12);

/* Danger, cancellations, and error toasts */
--status-danger: #ef4444;
--status-danger-bg: rgba(239, 68, 68, 0.12);
```

### 2.3 Typographic Color Scale
```css
/* Primary high-contrast text for headers & key numbers */
--text-primary: #f8fafc;

/* Secondary text for table descriptions, meta labels, and subheadings */
--text-secondary: #94a3b8;

/* Tertiary text for timestamps, inactive states, and subtle hints */
--text-muted: #64748b;
```

---

## 3. Typography Hierarchy

The typographic system is built on the **Inter / Geist** sans-serif font family:

| Role | Font Size | Weight | Tracking / Line Height | Usage Example |
| :--- | :--- | :--- | :--- | :--- |
| **Display 1** | `2.25rem` (36px) | `700` (Bold) | `-0.025em` / `1.2` | Primary Dashboard Revenue Metric |
| **Headline** | `1.5rem` (24px) | `600` (SemiBold) | `-0.02em` / `1.3` | Workspace Headers, Modal Titles |
| **Subhead** | `1.125rem` (18px) | `500` (Medium) | `-0.01em` / `1.4` | KOT Ticket Numbers, Table Labels |
| **Body Primary**| `0.875rem` (14px) | `400` (Normal) | `0em` / `1.5` | Menu Item Descriptions, Notes |
| **Caption / Tag**| `0.75rem` (12px) | `600` (SemiBold) | `+0.05em` / `1.0` | Status Badges (`SERVED`, `COOKING`) |
| **Mono Metrics**| `0.875rem` (14px) | `500` (Medium) | `0em` / `1.0` | Prices, Totals, Quantities |

---

## 4. Component Styling & Interactive Behaviors

### 4.1 Buttons & Touch Surfaces
- **Primary Actions** ("Settle Bill", "Place Order"): Gradient amber background (`from-amber-500 to-amber-600`), high-contrast dark text (`text-neutral-950`), subtle box shadow (`shadow-[0_0_20px_rgba(217,119,6,0.3)]`), and a tactile `:active` scale of `0.98`.
- **Secondary Actions** ("Cancel", "Print"): Bordered slate container (`border-zinc-700 bg-zinc-900/60 text-zinc-200`) with hover lightening.

### 4.2 Status Badges (KOT & Orders)
- Status badges use rounded pill containers (`rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase`) with semi-transparent tinted backgrounds and matched 1px borders:
  - `PENDING`: Zinc neutral (`bg-zinc-800/80 text-zinc-300 border-zinc-700`)
  - `COOKING` / `PREPARING`: Amber radiance (`bg-amber-950/40 text-amber-400 border-amber-800/60 animate-pulse`)
  - `SERVED` / `READY`: Emerald glow (`bg-emerald-950/40 text-emerald-400 border-emerald-800/60`)
  - `CANCELLED`: Crimson muted (`bg-rose-950/40 text-rose-400 border-rose-800/60`)

### 4.3 Cards & Modals
- **Backdrop Blur**: Modals and sticky headers utilize `backdrop-blur-md bg-black/70` for spatial depth.
- **Card Enclosures**: Standard card components feature a `1px` subtle border (`border-zinc-800/80`) on an obsidian slate fill (`bg-zinc-900/40`), eliminating visual noise while maintaining clear division.
```

