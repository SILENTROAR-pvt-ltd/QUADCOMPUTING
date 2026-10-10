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
[User Action] ---> [Client Button Lock (useRef)]
                          |
                          v
         [Generate Idempotency Key (SHA/UUID)]
                          |
                          v
         [Next.js API Handler (/api/...)]
                          |
                          v
         [withIdempotency() Sliding Window (2,000ms)]
             /                              \
     [New Request]                   [Duplicate Request]
          |                                   |
    Execute Logic                     Return 409 Conflict
```

1. **Client-Side Submit Locks**: High-risk dispatch triggers (`useGuestOrderDispatch`, `useBillingSettlement`) employ React `useRef` locks (`isSubmittingRef`, `isSettlingRef`) to immediately block rapid tap sequences before network dispatch.
2. **Backend Sliding-Window Idempotency**: Critical endpoints (`/api/guest/order`, `/api/host/sessions`, `/api/guest/wallet/redeem`, `/api/host/wallet/redeem`) pass through `withIdempotency(key, handler, 2000)`. Duplicate submissions within a 2-second window are trapped and rejected with HTTP `409 Conflict`.
3. **Database-Level Row Locks**: `SELECT ... FOR UPDATE` row locks in `deduct_venue_wallet_credits` and `deduct_recipe_inventory_for_order` guarantee strict serializability for monetary balances and inventory stock counts.

---

## 4. Realtime WebSocket Architecture & Memory Hygiene

Supabase Realtime Channels are used for live KOT pipelines, bill settlement notices, and guest table status sync:

```typescript
// Strict Lifecycle Pattern: Always unmount channels cleanly
useEffect(() => {
  const channel = supabase.channel(`biz_${businessId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, handleOrderUpdate)
    .subscribe();

  return () => {
    // Calling supabase.removeChannel ensures zombie listeners are detached from memory
    void supabase.removeChannel(channel);
  };
}, [businessId]);
```

- **Health Monitoring**: `RealtimeHealthIndicator` dynamically monitors connection states (`SUBSCRIBED`, `CHANNEL_ERROR`, `CLOSED`, `TIMED_OUT`) and renders a subtle amber alert when network drops occur.

---

## 5. Repository File & Directory Structure

```
.
├── app/                                    # Next.js App Router root
│   ├── (auth)/                             # Authentication routes (login, register)
│   ├── admin/                              # Super-admin & franchise oversight views
│   ├── api/                                # Next.js Serverless Route Handlers
│   │   ├── guest/                          # Guest public APIs (order, lobby, wallet)
│   │   │   ├── order/route.ts              # Idempotent order placement & KOT generation
│   │   │   └── wallet/redeem/route.ts      # Guest wallet redemption code issuance
│   │   ├── host/                           # Host & staff protected APIs
│   │   │   ├── kitchen/tickets/route.ts    # KOT status updates & inventory triggers
│   │   │   ├── sessions/route.ts           # Table session lifecycle & bill settlements
│   │   │   └── wallet/redeem/route.ts      # Host redemption code verification
│   │   └── venue/                          # Venue configuration & catalog endpoints
│   ├── guest/                              # Guest QR web application
│   │   ├── menu/page.tsx                   # Digital menu catalog & item selection
│   │   └── lobby/page.tsx                  # Interactive social table lobby
│   ├── host/                               # Host/Staff Backoffice & POS
│   │   ├── dashboard/page.tsx              # Primary management workspace
│   │   └── pos/page.tsx                    # Quick-service point of sale
│   ├── layout.tsx                          # Root layout with RealtimeHealthIndicator
│   └── page.tsx                            # Landing / gateway screen
├── components/                             # Modular React components (<90 LOC)
│   ├── common/                             # Shared components (RealtimeHealthIndicator)
│   ├── guest/                              # Guest-facing UI (Cart, Menu, Wallet modal)
│   └── host/                               # Host workspaces (Kitchen, Billing, Inventory)
│       └── workspaces/
│           ├── kitchen/                    # Live KOT Kanban & ticket cards
│           ├── billing/                    # Bill settlement, checkout, tax calc
│           └── inventory/                  # Stock levels, recipe ingredient links
├── lib/                                    # Core business logic & utility modules
│   ├── services/                           # Pure decoupled service routines
│   │   ├── guest-order/                    # Order submission, KOT generator, DB sync
│   │   ├── session/                        # Bill settlement & session close logic
│   │   ├── inventory/                      # Automated recipe deduction service
│   │   └── api-idempotency.util.ts         # In-memory sliding-window idempotency
│   └── utils/                              # Shared helpers (api-response, qr-session)
├── supabase/                               # Database migrations & seed scripts
│   └── migrations/                         # Immutable SQL migration ledger
│       ├── 20261004000001_comprehensive_rls_and_rpc_lockdown.sql
│       ├── 20261004000002_rpc_security_idor_and_pgbouncer.sql
│       └── 20261004000003_production_pillars_rls_and_inventory.sql
├── types/                                  # Global TypeScript definitions
├── scratch/                                # Concurrency & stress test suites
├── architecture.md                         # This architecture blueprint
├── design.md                               # Visual design & design tokens
├── memory.md                               # Active state ledger
├── phases.md                               # Roadmap & milestone tracker
├── prd.md                                  # Product Requirements Document
└── rules.md                                # AI guardrails & engineering rules
```
