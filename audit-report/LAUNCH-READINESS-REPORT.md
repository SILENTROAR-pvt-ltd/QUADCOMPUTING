# Quad Computing V1 — Launch Readiness Report

**Date:** 2026-10-07  
**Scope:** Full hardening pass across critical financial pipelines, API error-boundary coverage, wallet top-up/redemption idempotency, realtime channel venue-isolation, and production verification.

---

## Verdict

**Conditionally Ready for Pilot Deployment**

- TypeScript Compilation: **0 errors** (`tsc --noEmit`).
- Test Suite: **144 / 144 passing** across 23 test suites (`vitest run`).
- API Error-Boundary Coverage: **100%** of route handlers across `app/api/` (54 real routes).
- Database RPCs: All critical RPCs (`submit_guest_order_atomic`, `execute_atomic_bill_settlement`, `update_kot_status`, `deduct_recipe_inventory_for_order`, `deduct_venue_wallet_credits`, `approve_topup_request`, `generate_daily_z_report`) are verified active in the live Supabase project.

---

## Summary of Fixes Applied

### 1. Realtime Sync & Cross-Tenant Channel Isolation
- **Venue-Scoped Channels:** Created `lib/realtime/channels.ts` to namespace all guest and KDS channels as `biz_<business_id>_table_<table_number>` and `biz_<business_id>_kitchen`. Prevents cross-venue collisions where table 1 in Cafe A received settlement or KOT broadcasts from table 1 in Cafe B.
- **Server-Side REST Broadcast (`httpSend`):** Replaced unscoped client broadcasts with reliable server-side broadcasts (`httpSend`) inside `settle-session.service.ts` and `app/api/host/kitchen/tickets/route.ts`.
- **Slug-to-UUID Resolution:** Fixed guest menu initialization so that when a guest opens a table via URL slug (e.g. `?cafe=bombay-rasoi`), the real venue UUID is passed to `useGuestRealtimeSync`, ensuring the channel subscription connects to the right venue topic.
- **Removed Dead Anon DB Listeners:** Removed anonymous `postgres_changes` listeners from the guest page since RLS blocks anonymous access; guests now receive push updates via venue-scoped broadcasts, backed by HTTP polling fallback (3.5s – 15s).

### 2. KDS Kitchen Display "Item Done" Checkbox
- **Found and fixed:** In `app/api/host/kitchen/tickets/route.ts`, checking an item done previously sent `{ id, items }` without a `status` property, causing the API to reject it with a 400 Bad Request and losing ticks. The route now explicitly accepts items-only updates and persists item checkboxes reliably.

### 3. Financial & Order Atomicity (From Prior Pass)
- **Guest Order → KOT:** Atomic RPC `submit_guest_order_atomic` wraps orders, order_items, KOT, and table sync into one transaction.
- **KOT Lifecycle & Stock Depletion:** `update_kot_status` triggers `deduct_recipe_inventory_for_order` with an atomic check-and-set flag (`orders.inventory_deducted_at`), preventing double stock deductions on retries or bill settlements.
- **Bill Settlement & Cashback:** `execute_atomic_bill_settlement` calculates 7% cashback, handles wallet redemptions, deducts the ₹3 platform fee exactly once, and vacates tables atomically.
- **Wallet Top-Up Security:** Removed unauthenticated direct wallet credit path; all top-ups require a 12-digit UTR and admin approval.

---

## Pre-Launch Deployment Checklist

1. **Production Node.js Environment:**
   - Next.js 15.5.27 uses `AsyncLocalStorage.snapshot`, which requires **Node.js >= 20.0.0**.
   - Ensure production hosting (Vercel, AWS Amplify, Docker) is configured to **Node 20.x or 22.x LTS**.
   - (Locally, upgrade Windows Node from 19.6.0 to Node 20+ via `winget install OpenJS.NodeJS.LTS` to run `npm run build` locally).

2. **Environment Variables for Production:**
   - Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - Set `SUPABASE_SERVICE_ROLE_KEY` (mandatory for server admin mutations).
   - Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`, and set `RATE_LIMIT_REQUIRE_REDIS=1` to enable distributed rate limiting across serverless instances.

3. **Real-Device Smoke Testing:**
   - Test table settlement and KOT status updates across two separate venues simultaneously to verify that Table 1 events do not leak across venues.
