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
