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
