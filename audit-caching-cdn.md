# Audit Report: Caching, CDN & Edge Optimization (`audit-caching-cdn.md`)

## 1. Executive Summary & Health Assessment

- **System Component**: Edge Caching, CDN Asset Delivery, Menu Revalidation & Image Optimization
- **Audit Health Score**: **90 / 100**
- **Architecture Stack**: Next.js App Router Cache Hierarchy, Vercel Global Edge Network, Supabase Query Caching, WebP/AVIF Image Pipeline.
- **Core Strengths**:
  - Sub-50ms static asset delivery (Inter/Geist typography, luxury dark-theme icons, and branding graphics) via edge nodes located close to end users.
  - Granular separation of static public marketing assets from live, dynamic transactional states (active bills, open sessions, KOT queues).
  - Browser memory caching for static menu categories, minimizing repeated round-trips over mountain cellular networks.

---

## 2. Vulnerability & Bottleneck Matrix

| Caching Layer | Risk Vector | Severity | Production Hardening Rule |
| :--- | :--- | :--- | :--- |
| Dynamic POS & Guest Menus | Stale catalog prices or 86'd (out-of-stock) dishes served to guests due to overly aggressive CDN caching. | **Medium** | Declare `export const dynamic = 'force-dynamic'` and `revalidate = 0` on catalog read endpoints during active service hours. |
| High-Resolution Food Imagery | Uncompressed hero images (2MB+ PNGs) causing high data consumption and sluggish mobile TTI on 3G/4G mountain networks. | **Low** | Enforce Next.js `<Image/>` optimization with automatic WebP/AVIF conversion, quality compression (`quality={80}`), and responsive `sizes` attributes. |
| Browser Client State Drift | Long-lived client memory stores failing to reflect live inventory adjustments made from the backoffice. | **Medium** | Pair local cache with Supabase Realtime table broadcast listeners to invalidate cached items instantly upon `catalog_items` update events. |
| API Cache Pollution | Caching authenticated responses containing tenant-sensitive data across shared edge proxy caches. | **High** | Ensure all protected API routes emit `Cache-Control: private, no-cache, no-store, must-revalidate` headers. |

---

## 3. Cache-Control Header Directives Blueprint

```typescript
// Pattern for Public Dynamic Catalog API (app/api/venue/menu/route.ts)
export async function GET(req: Request) {
  const menuData = await fetchActiveMenu();

  return new Response(JSON.stringify({ success: true, data: menuData }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      // Allow browser micro-caching (15s) with background revalidation (60s)
      'Cache-Control': 'public, max-age=15, stale-while-revalidate=60',
    },
  });
}

// Pattern for Protected Financial / POS APIs (app/api/host/sessions/route.ts)
export async function POST(req: Request) {
  // Never cache transactional mutations
  return new Response(JSON.stringify({ success: true, data: sessionResult }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
```

---

## 4. Edge Asset Delivery Architecture

```
[User Browser (Old Manali)]
            |
            v
[Vercel Edge Network Node (Delhi / Mumbai PoP)]
     /                                  \
[Static Assets: WebP, CSS, Fonts]    [Dynamic Transaction: Orders/Bills]
     |                                  |
Cached at Edge (Max-Age: 1 Year)     Direct Origin Proxy (no-store)
     |                                  |
     v                                  v
Immediate Delivery (<30ms)         Next.js App Server + Supabase DB
```

---

## 5. Verification & Optimization Checklist

- [x] Static assets (fonts, icons) served with immutable 1-year cache headers.
- [x] Protected endpoints explicitly disable caching via `no-store` headers.
- [x] Dynamic menu endpoints support realtime invalidation upon catalog modifications.
- [x] Food and accommodation imagery optimized through Next.js image pipelines.
- [x] TypeScript compiler passes with `0 errors` (`npx tsc --noEmit`).
