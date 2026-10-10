# FORENSIC AUDIT REPORT: ORDER PIPELINE 500 ERROR

## 1. Executive Summary
The guest order placement pipeline is experiencing a **500 Internal Server Error** exclusively when testing locally on new setups ("new profiles"). 

This is **NOT a codebase pipeline issue** or a bug in the TypeScript logic. This is a **Supabase environment/permissions alignment error** caused by a missing Service Role Key in the local environment interacting with the strict RLS (Row Level Security) lockdown implemented in your latest migrations.

## 2. Deep Dive: Root Cause of the 500 Error
When a guest attempts to place an order, `app/api/guest/order/route.ts` calls `submitGuestOrder` which triggers the `submit_guest_order_atomic` Remote Procedure Call (RPC) on the Supabase database.

### The Attack Surface & Security Model
In migration `20261006000006_atomic_guest_order_and_inventory_idempotency.sql`, the following strict permission rule was defined to prevent IDOR (Insecure Direct Object Reference) and malicious scraping:
```sql
REVOKE EXECUTE ON FUNCTION public.submit_guest_order_atomic(...) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.submit_guest_order_atomic(...) TO authenticated, service_role;
```

### Why it fails locally (The Disconnect):
1. The Next.js API route utilizes `adminDb()` to execute this trusted RPC.
2. `adminDb()` expects `SUPABASE_SERVICE_ROLE_KEY` to be present in your `.env.local` to bypass RLS and assume the `service_role`.
3. Because the Service Role Key is **missing** from your local environment, `adminDb()` silently falls back to `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. It connects to Supabase as the `anon` (anonymous) role.
5. The `anon` role has explicitly had its `EXECUTE` privileges revoked for this atomic RPC.
6. Supabase throws a **PGRST202 (Permission Denied / Function Not Found)** error, which the backend catches and bubbles up as a **500 Internal Server Error**.

## 3. Secondary Cascading Failures (Venue Guard)
Even if the RPC execution succeeded, the pipeline would still fail earlier in the chain at the **Billing Guard (`venue-guard.service.ts`)**:
```typescript
const [walletRes, subRes] = await Promise.all([
  client.from('venue_wallets').select('*').eq('venue_id', venueId).maybeSingle(),
  // ...
]);
```
Migration `20261005000002_rls_lockdown.sql` strictly enforces that `venue_wallets` can only be read by the authenticated host who owns it. Because `adminDb()` is operating as `anon` (due to the missing key), it reads `null`. The backend then attempts to `INSERT` a new trial wallet, which also fails because `anon` has no insert privileges, crashing the pipeline.

## 4. Why did this work before?
Before the `rls_lockdown` and `atomic_guest_order` migrations were applied (or when testing on an environment that had the service key properly injected), the database was permissive. 
- You are now testing a **production-grade security architecture** on a local environment that lacks the required **production-grade server credentials**.

## 5. Required Action Plan (To Execute)
To fix this "A to Z" without compromising the strict security model:

**DO NOT modify the codebase to bypass security.** The codebase is strictly aligned with the database schema.

**Action Required from Host/Developer:**
1. Open your Supabase Dashboard -> Settings -> API.
2. Copy the **`service_role` secret**.
3. Open `.env.local` on your machine.
4. Add the following line:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your_copied_service_role_key_here
   ```
5. Restart your Next.js local dev server.

Once this credential is provided, `adminDb()` will successfully assume the `service_role`, gaining access to read the venue wallets and execute the atomic KOT RPC, completely resolving the 500 error.
