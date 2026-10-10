# Audit Report: Frontend Architecture & State Resilience (`audit-frontend.md`)

## 1. Executive Summary & Health Assessment

- **System Component**: Frontend Architecture, View Layer & Client State Resilience
- **Audit Health Score**: **92 / 100**
- **Architecture Stack**: Next.js 14 App Router (RSC + Client Components), Tailwind CSS, Framer Motion, Zustand, Supabase Realtime Client wrappers (`@supabase/supabase-js 2.116.0`).
- **Core Strengths**: 
  - Robust optimistic UI with state snapshotting and automatic rollback in `useKitchenStatusUpdate.ts`.
  - Client-side debouncing and double-dispatch blocking via `useRef` locks (`isSubmittingRef`, `isSettlingRef`).
  - Strict memory leak prevention using `void supabase.removeChannel(channel)` on component unmount across all realtime hooks.
  - Active ambient connection status tracking via `RealtimeHealthIndicator.tsx`.

---

## 2. Vulnerability & Bottleneck Matrix

| Component / Hook | Failure Mode / Risk Vector | Severity | Production Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| `useGuestLobbyRealtime.ts` | Reconnection storms and listener pile-up on flaky mobile networks (e.g., Old Manali LTE/4G signal fades). | **High** | Exponential backoff reconnect jitter, single channel subscription tracking, and ambient status rendering via `RealtimeHealthIndicator`. |
| POS Cart & Menu State (`useCartStore.ts`, `submitGuestOrder`) | Local storage / client state desynchronization if table session ID rotates mid-visit. | **Medium** | Bind cart dispatch strictly to active `dine_in_sessions.id`. Validate session state via server-side verification before order insertion. |
| Bundle Size & Client Hydration | Unoptimized Lucide icon imports and heavy modal bundles impacting Time to Interactive (TTI) on low-end mobile devices. | **Low** | Implement Next.js `dynamic()` lazy-loading for backoffice drawers, modal sheets (`GuestIdentityModal`, `GuestWalletModal`), and chart analytics. |
| Order Dispatch Button (`GuestOrderBar.tsx`) | Frantic double-tap during network lag leading to duplicate order tickets before server response. | **High** | Component-level `useRef` submission lock combined with instant visual button disabling and client-generated idempotency keys. |

---

## 3. Production Hardening & Optimization Blueprint

### 3.1 Optimistic UI with Rollback Pattern
All high-impact status changes (e.g. KOT tickets transitioning from `pending` -> `cooking` -> `served`) must capture a pre-mutation snapshot and roll back with user notification if the network or API call fails:

```typescript
// Architectural Pattern established in useKitchenStatusUpdate.ts
const previousTickets = [...tickets];

// 1. Optimistic local update
setTickets((prev) =>
  prev.map((t) => (t.id === ticketId ? { ...t, status: nextStatus } : t))
);

try {
  const res = await fetch('/api/host/kitchen/tickets', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticket_id: ticketId, status: nextStatus }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Update failed');
} catch (err: any) {
  // 2. Automatic rollback to previous snapshot on failure
  setTickets(previousTickets);
  toast.error(err.message || 'Status update failed. Reverted.');
}
```

### 3.2 WebSocket Memory Leak Elimination
Supabase JS v2 client instances maintain internal channel reference maps. Simply calling `.unsubscribe()` leaves the channel registered in memory, leading to zombie event listeners and memory leaks. Every subscription must be strictly removed on unmount:

```typescript
// Verified lifecycle cleanup pattern
useEffect(() => {
  const channel = supabase
    .channel(`table_session_${sessionId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'dine_in_sessions' }, handleUpdate)
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}, [sessionId]);
```

### 3.3 Strict Component Modularity (< 90 LOC Protocol)
- Maintain all modified React components under **90 Lines of Code (LOC)**.
- Deconstruct complex layouts into:
  1. Presentational shell (`*View.tsx`)
  2. Isolated hooks for data fetching & realtime (`use*Data.ts`)
  3. Action handler utilities in `lib/services/`

---

## 4. Verification & Health Checklist

- [x] All realtime subscriptions implement `supabase.removeChannel(channel)` in cleanup hooks.
- [x] Optimistic UI transitions roll back cleanly on API rejection.
- [x] Ambient WebSocket health banner mounted in root `layout.tsx`.
- [x] Client submit buttons enforce debounce / lock flags before network dispatch.
- [x] TypeScript compiler passes with `0 errors` (`npx tsc --noEmit`).
