# PART F — GAP REPORT

This document lists every section, query, or file that could not be executed or extracted, the exact technical reason, and all factual contradictions between the codebase implementation and the architecture documentation (`architecture.md`, `rules.md`, `audit-*.md`). Facts only; no recommendations.

---

## 1. Unrun Commands & Unextracted Sections

### 1.1 Database Introspection Queries (A1 – A15)
- **Status**: `UNRUN`
- **Reason**: The workspace contains application source code and environment variables for public REST API access (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). There is no direct PostgreSQL TCP connection string (`DATABASE_URL`), `psql` command-line utility, or Supabase MCP database tool available in this environment. Direct SQL queries against PostgreSQL catalog tables (`pg_class`, `pg_proc`, `pg_policies`, etc.) cannot be executed over the anonymous Supabase PostgREST endpoint. All queries are documented verbatim in `audit-pack/db-queries.sql`.

### 1.2 Git Repository Commands (`git ls-files`, `git log`)
- **Status**: `UNRUN`
- **Reason**: The `git` executable is not installed or is not present in the Windows system `PATH` on this host. File tracking and migration sequencing were verified directly via filesystem directory traversal.

### 1.3 Production Build (`npm run build`)
- **Status**: Exited with code `1`
- **Reason**: The Next.js development server is actively running in the background (as task `2377` on port `3000`) and holds an active OS file lock on `.next/trace`, triggering `Error: EPERM: operation not permitted, open '...\\.next\\trace'`.

### 1.4 Linter Quality Gate (`npx eslint . --max-warnings=0`)
- **Status**: Exited with code `1` (23 problems: 8 errors, 15 warnings)
- **Errors Detected**:
  - `components/guest/menu/DiningFeed.tsx:211`: React Hook `useMemo` called conditionally after an early return.
  - `components/guest/menu/tracker/TrackerSettledView.tsx:18`: React Hook `useEffect` called conditionally.
  - `components/guest/DynamicIslandNotification.tsx:56`: Unescaped quote characters in JSX.
  - `components/host/workspaces/accommodations/OccupiedRoomModal.tsx:114`: Unescaped quote characters in JSX.
  - `components/host/workspaces/accommodations/checkin/CheckInAddonsSection.tsx:181`: Unescaped quote characters in JSX.

### 1.5 Supabase Cloud Console Settings
- **Status**: `UNKNOWN`
- **Reason**: Security Advisor, Performance Advisor, Auth email confirmation toggles, JWT expiry, and Point-in-Time Recovery (PITR) toggles reside inside the Supabase Cloud Web Dashboard and are not exposed via local source code files.

---

## 2. Factual Discrepancies & Contradictions with Documentation

1. **Idempotency Backend (Redis vs. In-Memory)**:
   - *Documentation Statement*: `audit-rate-limiting.md` references "Custom Redis/Memory sliding-window idempotency helper".
   - *Codebase Reality*: In `lib/services/api-idempotency.util.ts`, the cache is implemented purely as an in-memory Node.js JavaScript `Map`:
     ```typescript
     const idempotencyCache = new Map<string, { timestamp: number; response: any }>();
     ```
     There is no Redis connection, client dependency, or fallback configured in `package.json` or `api-idempotency.util.ts`. If the serverless function cold-starts or scales across multiple instances, the cache is isolated per process instance.

2. **Service Role Key Fallback in Guest Route**:
   - *Documentation Statement*: `rules.md` and `audit-hosting-deployment.md` state that `SUPABASE_SERVICE_ROLE_KEY` is strictly reserved for backend server crons and never checked in client/guest flows.
   - *Codebase Reality*: In `app/api/guest/onboard/route.ts` (line 9), the route explicitly falls back to `SUPABASE_SERVICE_ROLE_KEY`:
     ```typescript
     const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
     ```

3. **Type Mismatch in Recipe Deduction Linkage**:
   - *Documentation Statement*: `audit-database-storage.md` references unified `uuid` typing.
   - *Codebase Reality*: In `recipe_ingredients`, `catalog_item_id` is typed as `UUID`, whereas in `order_items`, `item_id` is typed as `TEXT`. The database stored procedure `deduct_recipe_inventory_for_order` must explicitly cast `catalog_item_id::text = v_item.item_id::text` to avoid type comparison errors.

4. **Dynamic Export Declarations on Route Handlers**:
   - *Documentation Statement*: `audit-caching-cdn.md` suggests `export const dynamic = 'force-dynamic'` is declared on catalog routes.
   - *Codebase Reality*: Forensic grep for `dynamic\s*=` across all files in `app/api/**` returns 0 hits. Route handlers currently rely on Next.js default route inference rather than explicit segment config exports.
