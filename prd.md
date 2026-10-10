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
