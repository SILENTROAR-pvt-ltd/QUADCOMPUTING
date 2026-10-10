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
