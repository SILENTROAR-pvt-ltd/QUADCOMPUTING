# PART C — AUTOMATED CHECKS & CODEBASE GREP AUDIT

This document records the exact raw terminal outputs of the required automated CLI commands, followed by line-by-line grep forensic extractions across all 15 audit patterns.

---

## 1. CLI Commands Execution Output

### Command 1: `npx tsc --noEmit`
```
Exit Code: 0
Output: (Empty - Zero errors detected)
```

### Command 2: `npx eslint . --max-warnings=0`
```
Exit Code: 1
Output:
D:\work\desktp\folder desktop\Desktop\Quad Computing V1\app\(guest)\menu\page.tsx
  48:6  warning  React Hook useEffect has a missing dependency: 'state'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

D:\work\desktp\folder desktop\Desktop\Quad Computing V1\components\guest\DynamicIslandNotification.tsx
  56:19  error  `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`  react/no-unescaped-entities
  56:44  error  `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`  react/no-unescaped-entities

D:\work\desktp\folder desktop\Desktop\Quad Computing V1\components\guest\lobby\useGuestLobbyRealtime.ts
  182:6  warning  React Hook useEffect has missing dependencies: 'activeChat', 'addChatMessage', 'addLobbyMessage', 'addNotification', 'setActiveChat', 'setLobbyMessages', and 'setOnlineUsers'. Either include them or remove the dependency array  react-hooks/exhaustive-deps

D:\work\desktp\folder desktop\Desktop\Quad Computing V1\components\guest\menu\BeyondDiningSection.tsx
  80:19  warning  Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

D:\work\desktp\folder desktop\Desktop\Quad Computing V1\components\guest\menu\DiningFeed.tsx
   35:11  warning  Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
  211:26  error    React Hook "useMemo" is called conditionally. React Hooks must be called in the exact same order in every component render. Did you accidentally call a React Hook after an early return?                                                                       react-hooks/rules-of-hooks

D:\work\desktp\folder desktop\Desktop\Quad Computing V1\components\guest\menu\VenueServiceModal.tsx
  46:17  warning  Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

D:\work\desktp\folder desktop\Desktop\Quad Computing V1\components\guest\menu\VenueServicesDrawer.tsx
  79:23  warning  Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

D:\work\desktp\folder desktop\Desktop\Quad Computing V1\components\guest\menu\VenueServicesMarquee.tsx
  158:17  warning  Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

D:\work\desktp\folder desktop\Desktop\Quad Computing V1\components\guest\menu\customization\CustomizationDrawerHeader.tsx
  35:11  warning  Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

D:\work\desktp\folder desktop\Desktop\Quad Computing V1\components\guest\menu\hooks\useGuestMenuSession.ts
  69:6  warning  React Hook useEffect has missing dependencies: 'businessName', 'session?.avatar', 'setSession', and 'setSessionSettled'. Either include them or remove the dependency array  react-hooks/exhaustive-deps

D:\work\desktp\folder desktop\Desktop\Quad Computing V1\components\guest\menu\hooks\useGuestOrderPolling.ts
  31:6  warning  React Hook useCallback has a missing dependency: 'p'. Either include it or remove the dependency array                            react-hooks/exhaustive-deps
  60:6  warning  React Hook useEffect has missing dependencies: 'isCheckingStatusRef' and 'p'. Either include them or remove the dependency array  react-hooks/exhaustive-deps
  79:6  warning  React Hook useEffect has a missing dependency: 'isPollingOrderRef'. Either include it or remove the dependency array              react-hooks/exhaustive-deps

D:\work\desktp\folder desktop\Desktop\Quad Computing V1\components\guest\menu\tracker\TrackerSettledView.tsx
  18:3  error  React Hook "useEffect" is called conditionally. React Hooks must be called in the exact same order in every component render  react-hooks/rules-of-hooks

D:\work\desktp\folder desktop\Desktop\Quad Computing V1\components\host\workspaces\BillingWorkspace.tsx
  99:6  warning  React Hook useEffect has a missing dependency: 'fetchOrderHistory'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

D:\work\desktp\folder desktop\Desktop\Quad Computing V1\components\host\workspaces\ExpensesWorkspace.tsx
  52:6  warning  React Hook useEffect has a missing dependency: 'loadData'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

D:\work\desktp\folder desktop\Desktop\Quad Computing V1\components\host\workspaces\accommodations\OccupiedRoomModal.tsx
  114:75   error  `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`  react/no-unescaped-entities
  114:105  error  `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`  react/no-unescaped-entities

D:\work\desktp\folder desktop\Desktop\Quad Computing V1\components\host\workspaces\accommodations\checkin\CheckInAddonsSection.tsx
  181:44  error  `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`  react/no-unescaped-entities
  181:60  error  `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`  react/no-unescaped-entities

D:\work\desktp\folder desktop\Desktop\Quad Computing V1\components\host\workspaces\catalog\RecipeModal.tsx
  57:6  warning  React Hook useEffect has a missing dependency: 'item.id'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

✖ 23 problems (8 errors, 15 warnings)
```

### Command 3: `npm run build`
```
Exit Code: 1
Output:
> quad-computing@0.1.0 build
> next build

  ▲ Next.js 14.2.35
  - Environments: .env.local

   Creating an optimized production build ...
uncaughtException [Error: EPERM: operation not permitted, open 'D:\work\desktp\folder desktop\Desktop\Quad Computing V1\.next\trace'] {
  errno: -4048,
  code: 'EPERM',
  syscall: 'open',
  path: 'D:\work\desktp\folder desktop\Desktop\Quad Computing V1\.next\trace'
}
Note: Next.js dev server is actively running in background and holds file lock on .next/trace.
```

### Command 4: `npm audit --omit=dev`
```
Exit Code: 1
Output:
# npm audit report
next  9.3.4-canary.0 - 16.3.0-preview.10
Severity: critical
Next.js self-hosted applications vulnerable to DoS via Image Optimizer remotePatterns configuration - https://github.com/advisories/GHSA-9g9p-9gw9-jx7f
Next.js: Unauthenticated Remote Code Execution on windows-hosted servers - https://github.com/advisories/GHSA-p293-qw3h-jr36
2 vulnerabilities (1 high, 1 critical)
To address all issues (including breaking changes), run:
  npm audit fix --force
```

### Command 5: `git ls-files | grep -iE "\.env|secret|credential|\.pem|\.key"`
```
Status: UNRUN: git ls-files | grep -iE "\.env|secret|credential|\.pem|\.key"
Reason: git executable is not installed / not present in PATH on this Windows host.
File System Audit:
- .env.local (Present in root, contains NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and GEMINI_API_KEY - all values redacted)
- No .pem or .key private certificate files found in repo.
```

### Command 6: `git log --oneline -n 30`
```
Status: UNRUN: git log --oneline -n 30
Reason: git executable is not installed / not present in PATH on this Windows host.
Note: Full timestamped migration sequence from 001_onboarding.sql through 20261004000003_production_pillars_rls_and_inventory.sql documented in 04-PART-B-TIER1-MIGRATIONS.md.
```

---

## 2. Forensic Codebase Grep Results (15 Patterns)

### 2.1 Pattern: `SUPABASE_SERVICE_ROLE | service_role | createClient(`
Total Hits: 144

**`app/api/admin/reset-balance/route.ts:9`**
```typescript
  8:   try {
  9:     const supabase = createClient();
  10:     const body = await request.json().catch(() => ({}));
```

**`app/api/admin/topup-requests/route.ts:14`**
```typescript
  13:   try {
  14:     const supabase = createClient();
  15:     const { searchParams } = new URL(request.url);
```

**`app/api/admin/topup-requests/route.ts:27`**
```typescript
  26:   try {
  27:     const supabase = createClient();
  28:     const body = await request.json();
```

**`app/api/guest/call-staff/route.ts:9`**
```typescript
  8: 
  9:     const supabase = createClient();
  10:     const { data, error } = await supabase
```

**`app/api/guest/lobby/route.ts:14`**
```typescript
  13:     const type = searchParams.get('type') || 'messages';
  14:     const supabase = createClient();
  15: 
```

**`app/api/guest/lobby/route.ts:73`**
```typescript
  72:     const body = await request.json();
  73:     const supabase = createClient();
  74: 
```

**`app/api/guest/lobby/route.ts:229`**
```typescript
  228: 
  229:     const supabase = createClient();
  230:     let chatId: string | null = null;
```

**`app/api/guest/menu/route.ts:58`**
```typescript
  57: 
  58:     const supabase = createClient();
  59:     const now = Date.now();
```

**`app/api/guest/onboard/route.ts:9`**
```typescript
  8:   const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  9:   const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  10:   if (!url || !key) {
```

**`app/api/guest/order/route.ts:13`**
```typescript
  12:   try {
  13:     const supabase = createClient();
  14:     const result = await getGuestActiveOrder(request.url, supabase);
```

**`app/api/guest/order/route.ts:33`**
```typescript
  32:   try {
  33:     const supabase = createClient();
  34:     const body = await request.json().catch(() => ({}));
```

**`app/api/guest/reviews/route.ts:13`**
```typescript
  12: 
  13:     const supabase = createClient();
  14:     try {
```

**`app/api/guest/reviews/route.ts:89`**
```typescript
  88:     // 2. Attempt Supabase Table Insertion
  89:     const supabase = createClient();
  90:     try {
```

**`app/api/guest/session/route.ts:11`**
```typescript
  10:   try {
  11:     const supabase = createClient();
  12:     const body = await request.json();
```

**`app/api/guest/session/route.ts:24`**
```typescript
  23:   try {
  24:     const supabase = createClient();
  25:     const result = await getGuestSession(request.url, supabase);
```

**`app/api/guest/session/route.ts:36`**
```typescript
  35:   try {
  36:     const supabase = createClient();
  37:     const body = await request.json();
```

**`app/api/guest/wallet/redeem/route.ts:9`**
```typescript
  8:     const body = await request.json();
  9:     const supabase = createClient();
  10:     const { withIdempotency, generateIdempotencyKey } = await import('@/lib/services/api-idempotency.util');
```

**`app/api/guest/wallet/route.ts:20`**
```typescript
  19: 
  20:     const supabase = createClient();
  21:     const result = await getGuestWallet(supabase, guestId, businessId, extraIdentifiers);
```

**`app/api/guest/wallet/route.ts:32`**
```typescript
  31:     const body = await request.json();
  32:     const supabase = createClient();
  33:     const result = await creditOrderCashback(supabase, body);
```

**`app/api/host/accommodations/categories/route.ts:20`**
```typescript
  19:   try {
  20:     const supabase = createClient();
  21:     const user = await getAuthenticatedUser(supabase);
```

**`app/api/host/accommodations/categories/route.ts:34`**
```typescript
  33:   try {
  34:     const supabase = createClient();
  35:     const user = await getAuthenticatedUser(supabase);
```

**`app/api/host/accommodations/categories/route.ts:50`**
```typescript
  49:   try {
  50:     const supabase = createClient();
  51:     const user = await getAuthenticatedUser(supabase);
```

**`app/api/host/accommodations/categories/route.ts:68`**
```typescript
  67:   try {
  68:     const supabase = createClient();
  69:     const user = await getAuthenticatedUser(supabase);
```

**`app/api/host/accommodations/history/route.ts:10`**
```typescript
  9:   try {
  10:     const supabase = createClient();
  11:     const { data: { user }, error: authError } = await supabase.auth.getUser();
```

**`app/api/host/accommodations/rooms/route.ts:8`**
```typescript
  7:   try {
  8:     const supabase = createClient();
  9:     const { data: { user }, error: authError } = await supabase.auth.getUser();
```

**`app/api/host/accommodations/rooms/route.ts:88`**
```typescript
  87:   try {
  88:     const supabase = createClient();
  89:     const { data: { user }, error: authError } = await supabase.auth.getUser();
```

**`app/api/host/accommodations/rooms/route.ts:160`**
```typescript
  159:   try {
  160:     const supabase = createClient();
  161:     const { data: { user }, error: authError } = await supabase.auth.getUser();
```

**`app/api/host/accommodations/rooms/route.ts:214`**
```typescript
  213:   try {
  214:     const supabase = createClient();
  215:     const { data: { user }, error: authError } = await supabase.auth.getUser();
```

**`app/api/host/accommodations/rooms/[id]/checkout/route.ts:11`**
```typescript
  10:   try {
  11:     const supabase = createClient();
  12:     const { data: { user }, error: authError } = await supabase.auth.getUser();
```

**`app/api/host/accommodations/rooms/[id]/dossier/route.ts:11`**
```typescript
  10:   try {
  11:     const supabase = createClient();
  12:     const { data: { user }, error: authError } = await supabase.auth.getUser();
```

### 2.2 Pattern: `\.rpc\(`
Total Hits: 4

**`app/api/host/orders/update-status/route.ts:101`**
```typescript
  100:           const depletionPromises = Object.entries(rawMaterialUsage).map(([rawItemId, totalUsed]) => {
  101:             return supabase.rpc('deduct_inventory_stock', {
  102:               p_raw_item_id: rawItemId,
```

**`lib/services/inventory/recipe-deduction.service.ts:8`**
```typescript
  7:     if (supabase && typeof supabase.rpc === 'function') {
  8:       const { data, error } = await supabase.rpc('deduct_recipe_inventory_for_order', {
  9:         p_order_id: orderId,
```

**`lib/services/orders/recipe-deduction.service.ts:28`**
```typescript
  27:         const deductQty = (Number(rec.quantity_required) || 0) * qty;
  28:         await supabase.rpc('deduct_inventory_stock', {
  29:           p_raw_item_id: rec.raw_item_id,
```

**`lib/services/wallet/fee-guard.service.ts:101`**
```typescript
  100:     try {
  101:       const { data: rpcRes, error: rpcErr } = await supabaseClient.rpc(
  102:         'deduct_venue_wallet_credits',
```

### 2.3 Pattern: `\.from\(` inside `app/api/**` WITHOUT `business_id` / `.eq` nearby
Total Hits: 40

**`app/api/guest/lobby/route.ts:19`**
```typescript
  18:         const { data, error } = await supabase
  19:           .from('lobby_messages')
  20:           .select('*')
```

**`app/api/guest/lobby/route.ts:94`**
```typescript
  93:         const { data, error } = await supabase
  94:           .from('lobby_messages')
  95:           .insert({
```

**`app/api/guest/lobby/route.ts:134`**
```typescript
  133:         const { data, error } = await supabase
  134:           .from('private_chat_messages')
  135:           .insert({
```

**`app/api/guest/lobby/route.ts:187`**
```typescript
  186:       const { data, error } = await supabase
  187:         .from('table_invitations')
  188:         .insert({
```

**`app/api/guest/lobby/route.ts:238`**
```typescript
  237:         const { data: chatRow } = await supabase
  238:           .from('private_chats')
  239:           .insert({
```

**`app/api/guest/lobby/route.ts:260`**
```typescript
  259:       await supabase
  260:         .from('table_invitations')
  261:         .update({
```

**`app/api/guest/onboard/route.ts:68`**
```typescript
  67:         const { data, error } = await supabase
  68:           .from('guest_sessions')
  69:           .insert([newGuestRecord])
```

**`app/api/guest/onboard/route.ts:85`**
```typescript
  84:           const { data: retryData, error: retryError } = await supabase
  85:             .from('guest_sessions')
  86:             .insert([{
```

**`app/api/guest/wallet/redeem/route.ts:42`**
```typescript
  41: 
  42:     for (const rec of Array.from(inMemoryRedemptions.values())) {
  43:       if (
```

**`app/api/host/accommodations/history/route.ts:38`**
```typescript
  37:     let query = supabase
  38:       .from('room_stay_logs')
  39:       .select(`
```

**`app/api/host/accommodations/rooms/route.ts:22`**
```typescript
  21:     if (!business) {
  22:       const { data: fb } = await supabase.from('businesses').select('id').limit(1).maybeSingle();
  23:       business = fb;
```

**`app/api/host/accommodations/rooms/route.ts:32`**
```typescript
  31:     const { data: rooms, error: roomsError } = await supabase
  32:       .from('rooms')
  33:       .select(`
```

**`app/api/host/accommodations/rooms/route.ts:51`**
```typescript
  50:       const { data: orders } = await supabase
  51:         .from('orders')
  52:         .select('id, room_id, grand_total, status')
```

**`app/api/host/accommodations/rooms/route.ts:102`**
```typescript
  101:     if (!business) {
  102:       const { data: fb } = await supabase.from('businesses').select('id').limit(1).maybeSingle();
  103:       business = fb;
```

**`app/api/host/accommodations/rooms/[id]/checkout/route.ts:28`**
```typescript
  27:     const { data: room, error: roomError } = await supabase
  28:       .from('rooms')
  29:       .select(`
```

**`app/api/host/accommodations/rooms/[id]/checkout/route.ts:118`**
```typescript
  117:       const { data: updatedMaster } = await supabase
  118:         .from('orders')
  119:         .update({
```

**`app/api/host/accommodations/rooms/[id]/checkout/route.ts:161`**
```typescript
  160:       await supabase
  161:         .from('orders')
  162:         .update({
```

**`app/api/host/accommodations/rooms/[id]/checkout/route.ts:182`**
```typescript
  181:         await supabase
  182:           .from('room_stay_logs')
  183:           .update({
```

**`app/api/host/accommodations/rooms/[id]/checkout/route.ts:216`**
```typescript
  215:     const { data: updatedRoom, error: updateError } = await supabase
  216:       .from('rooms')
  217:       .update({
```

**`app/api/host/accommodations/rooms/[id]/dossier/route.ts:25`**
```typescript
  24:     const { data: room, error: roomError } = await supabase
  25:       .from('rooms')
  26:       .select(`
```

**`app/api/host/accommodations/rooms/[id]/dossier/route.ts:62`**
```typescript
  61:       const { data: logs } = await supabase
  62:         .from('room_stay_logs')
  63:         .select('*')
```

**`app/api/host/accommodations/rooms/[id]/status/route.ts:211`**
```typescript
  210:           await supabase
  211:             .from('orders')
  212:             .update({
```

**`app/api/host/catalog/bulk-insert/route.ts:70`**
```typescript
  69:     const { data: insertedItems, error: catalogError } = await supabase
  70:       .from('catalog_items')
  71:       .insert(catalogPayload)
```

**`app/api/host/catalog/bulk-insert/route.ts:91`**
```typescript
  90:       const { error: inventoryError } = await supabase
  91:         .from('inventory_stock')
  92:         .insert(inventoryPayload);
```

**`app/api/host/catalog/create/route.ts:116`**
```typescript
  115:       const { error: invError } = await supabase
  116:         .from('inventory_stock')
  117:         .insert({
```

**`app/api/host/catalog/recipe/route.ts:60`**
```typescript
  59: 
  60:       const { error: insertError } = await supabase.from('recipe_ingredients').insert(payload);
  61:       if (insertError) throw insertError;
```

**`app/api/host/catalog/update/route.ts:100`**
```typescript
  99:     const { data: updatedItem, error: updateError } = await supabase
  100:       .from('catalog_items')
  101:       .update({
```

**`app/api/host/catalog/update/route.ts:122`**
```typescript
  121:       await supabase
  122:         .from('inventory_stock')
  123:         .upsert({
```

**`app/api/host/catalog/update/route.ts:133`**
```typescript
  132:       await supabase
  133:         .from('room_categories')
  134:         .update({
```

**`app/api/host/expenses/staff/route.ts:106`**
```typescript
  105:     const { data: updatedStaff, error: updateError } = await supabase
  106:       .from('staff_profiles')
  107:       .update({
```

**`app/api/host/inventory/audit/route.ts:53`**
```typescript
  52:       await supabase
  53:         .from('raw_inventory_items')
  54:         .update({
```

**`app/api/host/inventory/audit/route.ts:79`**
```typescript
  78:       const { error: auditError } = await supabase
  79:         .from('inventory_audits')
  80:         .insert(auditRecords);
```

**`app/api/host/inventory/items/route.ts:62`**
```typescript
  61:     const { data: insertedItems, error } = await supabase
  62:       .from('raw_inventory_items')
  63:       .insert(rows)
```

**`app/api/host/inventory/items/route.ts:80`**
```typescript
  79:     if (logRows.length > 0) {
  80:       await supabase.from('inventory_logs').insert(logRows);
  81:     }
```

**`app/api/host/inventory/ocr-ingest/route.ts:42`**
```typescript
  41:         const { data: updated, error: updateError } = await supabase
  42:           .from('raw_inventory_items')
  43:           .update({
```

**`app/api/host/profile/update/route.ts:89`**
```typescript
  88:     try {
  89:       const { error: profileError } = await supabase.from('profiles')
  90:         .upsert(profileUpdates, { onConflict: 'id' });
```

**`app/api/host/wallet/redeem/route.ts:40`**
```typescript
  39:       let match: any = null;
  40:       for (const rec of Array.from(inMemoryRedemptions.values())) {
  41:         const recNorm = (rec.table_number || '').replace(/^(table|t-)\s*/i, '').trim().toUpperCase();
```

**`app/api/host/wallet/route.ts:20`**
```typescript
  19:     if (!venueId) {
  20:       const { data: biz } = await supabase.from('businesses').select('id').limit(1).maybeSingle();
  21:       venueId = biz?.id || 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';
```

**`app/api/venue/offers/route.ts:142`**
```typescript
  141:       const { data, error } = await supabase
  142:         .from('venue_live_offers')
  143:         .insert({
```

**`app/api/venue/photo-vault/route.ts:137`**
```typescript
  136:       const { data, error } = await supabase
  137:         .from('venue_photo_vault')
  138:         .insert({
```

### 2.4 Pattern: `getSession\(` vs `getUser\(` on Server Code
Total Hits: 54

**`app/api/host/accommodations/categories/route.ts:13`**
```typescript
  12: async function getAuthenticatedUser(supabase: any) {
  13:   const { data: { user }, error } = await supabase.auth.getUser();
  14:   if (error || !user) return null;
```

**`app/api/host/accommodations/history/route.ts:11`**
```typescript
  10:     const supabase = createClient();
  11:     const { data: { user }, error: authError } = await supabase.auth.getUser();
  12: 
```

**`app/api/host/accommodations/rooms/route.ts:9`**
```typescript
  8:     const supabase = createClient();
  9:     const { data: { user }, error: authError } = await supabase.auth.getUser();
  10: 
```

**`app/api/host/accommodations/rooms/route.ts:89`**
```typescript
  88:     const supabase = createClient();
  89:     const { data: { user }, error: authError } = await supabase.auth.getUser();
  90: 
```

**`app/api/host/accommodations/rooms/route.ts:161`**
```typescript
  160:     const supabase = createClient();
  161:     const { data: { user }, error: authError } = await supabase.auth.getUser();
  162: 
```

**`app/api/host/accommodations/rooms/route.ts:215`**
```typescript
  214:     const supabase = createClient();
  215:     const { data: { user }, error: authError } = await supabase.auth.getUser();
  216: 
```

**`app/api/host/accommodations/rooms/[id]/checkout/route.ts:12`**
```typescript
  11:     const supabase = createClient();
  12:     const { data: { user }, error: authError } = await supabase.auth.getUser();
  13: 
```

**`app/api/host/accommodations/rooms/[id]/dossier/route.ts:12`**
```typescript
  11:     const supabase = createClient();
  12:     const { data: { user }, error: authError } = await supabase.auth.getUser();
  13: 
```

**`app/api/host/accommodations/rooms/[id]/orders/route.ts:12`**
```typescript
  11:     const supabase = createClient();
  12:     const { data: { user }, error: authError } = await supabase.auth.getUser();
  13: 
```

**`app/api/host/accommodations/rooms/[id]/status/route.ts:13`**
```typescript
  12:     const supabase = createClient();
  13:     const { data: { user }, error: authError } = await supabase.auth.getUser();
  14: 
```

**`app/api/host/analytics/eod-z-report/route.ts:7`**
```typescript
  6:     const supabase = createClient();
  7:     const { data: { user } } = await supabase.auth.getUser();
  8: 
```

**`app/api/host/catalog/ai-ingest/route.ts:26`**
```typescript
  25:     // Enforce auth
  26:     const { data: { user } } = await supabase.auth.getUser();
  27:     if (!user) {
```

**`app/api/host/catalog/auto-fill-images/route.ts:9`**
```typescript
  8: 
  9:     const { data: { user }, error: authError } = await supabase.auth.getUser();
  10:     if (authError || !user) {
```

**`app/api/host/catalog/bulk-insert/route.ts:25`**
```typescript
  24:     // 1. Authenticate Request
  25:     const { data: { user } } = await supabase.auth.getUser();
  26:     if (!user) {
```

**`app/api/host/catalog/bulk-price-update/route.ts:7`**
```typescript
  6:     const supabase = createClient();
  7:     const { data: authData, error: authError } = await supabase.auth.getUser();
  8: 
```

**`app/api/host/catalog/create/route.ts:9`**
```typescript
  8: 
  9:     const { data: { user }, error: authError } = await supabase.auth.getUser();
  10:     if (authError || !user) {
```

**`app/api/host/catalog/recipe/route.ts:9`**
```typescript
  8:     const supabase = createClient();
  9:     const { data: { user }, error: authError } = await supabase.auth.getUser();
  10:     if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

**`app/api/host/catalog/recipe/route.ts:39`**
```typescript
  38:     const supabase = createClient();
  39:     const { data: { user }, error: authError } = await supabase.auth.getUser();
  40:     if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

**`app/api/host/catalog/route.ts:23`**
```typescript
  22:     const supabase = createClient();
  23:     const { data: { user }, error: authError } = await supabase.auth.getUser();
  24:     if (authError || !user) {
```

**`app/api/host/catalog/route.ts:43`**
```typescript
  42:     const supabase = createClient();
  43:     const { data: { user }, error: authError } = await supabase.auth.getUser();
  44:     if (authError || !user) {
```

**`app/api/host/catalog/update/route.ts:8`**
```typescript
  7: 
  8:     const { data: { user }, error: authError } = await supabase.auth.getUser();
  9: 
```

**`app/api/host/expenses/advances/route.ts:9`**
```typescript
  8:     const supabase = createClient();
  9:     const { data: { user }, error: authError } = await supabase.auth.getUser();
  10:     if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

**`app/api/host/expenses/bills/route.ts:9`**
```typescript
  8:     const supabase = createClient();
  9:     const { data: { user }, error: authError } = await supabase.auth.getUser();
  10:     if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

**`app/api/host/expenses/bills/route.ts:33`**
```typescript
  32:     const supabase = createClient();
  33:     const { data: { user }, error: authError } = await supabase.auth.getUser();
  34:     if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

**`app/api/host/expenses/staff/route.ts:9`**
```typescript
  8:     const supabase = createClient();
  9:     const { data: { user }, error: authError } = await supabase.auth.getUser();
  10:     if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

**`app/api/host/expenses/staff/route.ts:59`**
```typescript
  58:     const supabase = createClient();
  59:     const { data: { user }, error: authError } = await supabase.auth.getUser();
  60:     if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

**`app/api/host/expenses/staff/route.ts:94`**
```typescript
  93:     const supabase = createClient();
  94:     const { data: { user }, error: authError } = await supabase.auth.getUser();
  95:     if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

**`app/api/host/expenses/staff/route.ts:134`**
```typescript
  133:     const supabase = createClient();
  134:     const { data: { user }, error: authError } = await supabase.auth.getUser();
  135:     if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

**`app/api/host/inventory/audit/route.ts:7`**
```typescript
  6:     const supabase = createClient();
  7:     const { data: { user } } = await supabase.auth.getUser();
  8: 
```

**`app/api/host/inventory/items/route.ts:8`**
```typescript
  7: 
  8:     const { data: { user }, error: authError } = await supabase.auth.getUser();
  9:     if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

**`app/api/host/inventory/items/route.ts:33`**
```typescript
  32: 
  33:     const { data: { user }, error: authError } = await supabase.auth.getUser();
  34:     if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

**`app/api/host/inventory/items/route.ts:99`**
```typescript
  98: 
  99:     const { data: { user }, error: authError } = await supabase.auth.getUser();
  100:     if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

**`app/api/host/inventory/ocr-ingest/route.ts:8`**
```typescript
  7: 
  8:     const { data: { user }, error: authError } = await supabase.auth.getUser();
  9:     if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

**`app/api/host/orders/history/route.ts:8`**
```typescript
  7: 
  8:     const { data: { user }, error: authError } = await supabase.auth.getUser();
  9:     if (authError || !user) {
```

**`app/api/host/orders/update-status/route.ts:7`**
```typescript
  6:     const supabase = createClient();
  7:     const { data: { user } } = await supabase.auth.getUser();
  8: 
```

**`app/api/host/profile/route.ts:9`**
```typescript
  8:     const supabase = createClient();
  9:     const { data: authData, error: authError } = await supabase.auth.getUser();
  10: 
```

**`app/api/host/profile/route.ts:114`**
```typescript
  113:     const supabase = createClient();
  114:     const { data: authData, error: authError } = await supabase.auth.getUser();
  115: 
```

**`app/api/host/profile/update/route.ts:37`**
```typescript
  36:     const supabase = createClient();
  37:     const { data: authData } = await supabase.auth.getUser();
  38:     let userId = authData?.user?.id;
```

**`app/api/host/promotions/route.ts:9`**
```typescript
  8:     // 1. Get authenticated user
  9:     const { data: { user }, error: authError } = await supabase.auth.getUser();
  10: 
```

**`app/api/host/security/status/route.ts:10`**
```typescript
  9:     const supabase = createClient();
  10:     const { data: { user }, error: authError } = await supabase.auth.getUser();
  11: 
```

**`app/api/host/staff/verify-pin/verify-pin.service.ts:53`**
```typescript
  52:   const supabase = createClient();
  53:   const { data: { user } } = await supabase.auth.getUser();
  54:   const { business } = await resolveBusinessSecurity(user?.id);
```

**`app/api/host/tables/route.ts:32`**
```typescript
  31:     const supabase = createClient();
  32:     const { data: { user }, error: authError } = await supabase.auth.getUser();
  33:     if (authError || !user) {
```

**`app/api/host/tables/route.ts:56`**
```typescript
  55:     const supabase = createClient();
  56:     const { data: { user } } = await supabase.auth.getUser();
  57:     const body = await request.json();
```

**`app/api/host/tables/route.ts:76`**
```typescript
  75:     const supabase = createClient();
  76:     const { data: { user }, error: authError } = await supabase.auth.getUser();
  77:     if (authError || !user) {
```

**`lib/services/analytics.service.ts:9`**
```typescript
  8:   const { timeframe, startDate, endDate } = resolveAnalyticsDateRange(requestUrl);
  9:   const { data: { user }, error: authError } = await supabase.auth.getUser();
  10:   if (authError || !user) throw new Error('Unauthorized');
```

**`lib/services/catalog/resolve-business.util.ts:22`**
```typescript
  21:     try {
  22:       const { data: authData } = await supabase.auth.getUser();
  23:       if (authData?.user) {
```

**`lib/services/catalog-delete.service.ts:25`**
```typescript
  24:   let businessId = 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';
  25:   const { data: { user } } = await supabase.auth.getUser();
  26:   if (user?.id) {
```

**`lib/services/kitchen/business-resolver.service.ts:26`**
```typescript
  25:     try {
  26:       const { data: { user } } = await supabase.auth.getUser();
  27:       if (user) {
```

**`lib/services/orders/resolve-business.util.ts:11`**
```typescript
  10:   try {
  11:     const { data: { user } } = await supabase.auth.getUser();
  12:     if (user?.id) {
```

**`lib/services/session/active-sessions.service.ts:5`**
```typescript
  4: export async function getActiveHostSessions(supabase: any) {
  5:   const { data: { user } } = await supabase.auth.getUser();
  6:   let businessId: string | null = null;
```

**`lib/services/session/bill-history.service.ts:2`**
```typescript
  1: export async function getBillRequestHistory(supabase: any) {
  2:   const { data: { user } } = await supabase.auth.getUser();
  3:   let businessId: string | null = null;
```

**`lib/services/session/settle-session.service.ts:16`**
```typescript
  15:   try {
  16:     const { data: { user } } = await supabase.auth.getUser();
  17:     if (user) {
```

**`lib/services/table/get-tables.service.ts:24`**
```typescript
  23:   if (!businessId) {
  24:     const { data: authData } = await supabase.auth.getUser();
  25:     if (authData?.user) {
```

**`middleware.ts:30`**
```typescript
  29: 
  30:   const { data: { user } } = await supabase.auth.getUser();
  31: 
```

### 2.5 Pattern: `NEXT_PUBLIC_` Environment Variable Names Only
Total Names Found: 3
```
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_APP_URL
```

### 2.6 Pattern: `Math\.random | Date\.now\(\)` used for codes/tokens/ids
Total Hits: 7

**`components/host/workspaces/catalog/hooks/useCreateOfferForm.ts:28`**
```typescript
  27:           ? null
  28:           : new Date(Date.now() + parseInt(validDays, 10) * 86400000).toISOString();
  29: 
```

**`components/host/workspaces/catalog/RecipeModal.tsx:76`**
```typescript
  75:     setIngredients(prev => [...prev, {
  76:       id: Math.random().toString(), // Temp ID
  77:       raw_item_id: selectedRawId,
```

**`lib/services/accommodation/update-rooms.util.ts:32`**
```typescript
  31:         status: 'VACANT',
  32:         qr_code_hash: `ROOM_${categoryId.slice(0, 8)}_${num.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}_${idx}`,
  33:       }));
```

**`lib/services/guest-order/submit-order.service.ts:23`**
```typescript
  22:   const newItemsFormatted = incomingItems.map((item: any, idx: number) => ({
  23:     id: `item_${Date.now()}_${idx}`, order_id: targetOrderId, item_id: item.item_id || item.id || null,
  24:     item_name: item.name || item.title || 'Curated Dish', name: item.name || item.title || 'Curated Dish',
```

**`lib/services/guest-session/bill-request-event.util.ts:26`**
```typescript
  25:     recordBillRequestEvent({
  26:       id: `br_${Date.now()}`, session_id: updatedSession?.id || sessionId || null,
  27:       business_id: resolvedBizId, table_number: rawTable || normTable || '01',
```

**`lib/services/guest-session/init-session.service.ts:42`**
```typescript
  41:   if (!activeSession) {
  42:     activeSession = { id: `sess-${Date.now()}`, business_id: targetBizId || 'demo-biz', table_id: resolvedTableId, table_number: table_number || 'Unknown', guest_session_id, guest_handle, status: 'open' };
  43:   }
```

**`lib/utils/ids.ts:7`**
```typescript
  6: 
  7: export function generateUniqueOwnerCafeId(nowMs = Date.now()): OwnerCafeId {
  8:   const bytes = new Uint8Array(2);
```

### 2.7 Pattern: `req\.json\(\) / request\.json\()` not followed by a Zod `.parse/.safeParse`
Total Hits: 54
- `app/api/admin/reset-balance/route.ts:10`: `const body = await request.json().catch(() => ({}));`
- `app/api/admin/topup-requests/route.ts:28`: `const body = await request.json();`
- `app/api/guest/call-staff/route.ts:6`: `const body = await request.json();`
- `app/api/guest/lobby/route.ts:72`: `const body = await request.json();`
- `app/api/guest/lobby/route.ts:219`: `const body = await request.json();`
- `app/api/guest/onboard/route.ts:20`: `const body = await request.json().catch(() => ({}));`
- `app/api/guest/order/route.ts:34`: `const body = await request.json().catch(() => ({}));`
- `app/api/guest/reviews/route.ts:54`: `const body = await request.json();`
- `app/api/guest/session/route.ts:12`: `const body = await request.json();`
- `app/api/guest/session/route.ts:37`: `const body = await request.json();`
- `app/api/guest/wallet/redeem/route.ts:8`: `const body = await request.json();`
- `app/api/guest/wallet/route.ts:31`: `const body = await request.json();`
- `app/api/host/accommodations/categories/route.ts:38`: `const body = await request.json();`
- `app/api/host/accommodations/categories/route.ts:72`: `const body = await request.json();`
- `app/api/host/accommodations/rooms/route.ts:110`: `const body = await request.json();`
- `app/api/host/accommodations/rooms/route.ts:178`: `const body = await request.json();`
- `app/api/host/accommodations/rooms/[id]/checkout/route.ts:23`: `const body = await request.json().catch(() => ({}));`
- `app/api/host/accommodations/rooms/[id]/status/route.ts:24`: `const body = await request.json();`
- `app/api/host/catalog/ai-ingest/route.ts:31`: `const { image, mimeType } = await request.json();`
- `app/api/host/catalog/bulk-insert/route.ts:30`: `const { items } = await request.json();`
- `app/api/host/catalog/bulk-price-update/route.ts:14`: `const { locationIds, category, mode, value } = await request.json();`
- `app/api/host/catalog/create/route.ts:14`: `const body = await request.json();`
- `app/api/host/catalog/recipe/route.ts:45`: `const { catalogItemId, ingredients } = await request.json();`
- `app/api/host/catalog/route.ts:28`: `const body = await request.json();`
- `app/api/host/catalog/route.ts:52`: `const body = await request.json().catch(() => ({}));`
- `app/api/host/catalog/update/route.ts:14`: `const body = await req.json();`
- `app/api/host/expenses/advances/route.ts:15`: `const body = await request.json();`
- `app/api/host/expenses/bills/route.ts:39`: `const body = await request.json();`
- `app/api/host/expenses/staff/route.ts:65`: `const body = await request.json();`
- `app/api/host/expenses/staff/route.ts:100`: `const body = await request.json();`
- `app/api/host/inventory/audit/route.ts:24`: `const { audits } = await request.json();`
- `app/api/host/inventory/items/route.ts:39`: `const body = await request.json();`
- `app/api/host/inventory/items/route.ts:102`: `const body = await request.json();`
- `app/api/host/kitchen/tickets/route.ts:32`: `const body = await request.json();`
- `app/api/host/kitchen/tickets/route.ts:46`: `const { id, status, items } = await request.json();`
- `app/api/host/orders/create/route.ts:8`: `const body = await request.json().catch(() => ({}));`
- `app/api/host/orders/update-status/route.ts:24`: `const { orderId, status } = await request.json();`
- `app/api/host/profile/route.ts:121`: `const payload = await request.json();`
- `app/api/host/profile/update/route.ts:50`: `const rawPayload = await request.json();`
- `app/api/host/promotions/route.ts:45`: `const body = await req.json();`
- `app/api/host/sessions/fee/route.ts:17`: `const body = await request.json();`
- `app/api/host/sessions/route.ts:35`: `const body = await request.json();`
- `app/api/host/sessions/route.ts:60`: `const body = await request.json();`
- `app/api/host/staff/verify-pin/route.ts:9`: `const body = await request.json();`
- `app/api/host/tables/route.ts:37`: `const body = await request.json();`
- `app/api/host/tables/route.ts:57`: `const body = await request.json();`
- `app/api/host/tables/route.ts:81`: `const body = await request.json();`
- `app/api/host/wallet/outstanding/route.ts:30`: `const body = await request.json();`
- `app/api/host/wallet/redeem/route.ts:8`: `const body = await request.json();`
- `app/api/host/wallet/route.ts:35`: `const body = await request.json();`
- `app/api/venue/offers/route.ts:99`: `const body = await request.json().catch(() => ({}));`
- `app/api/venue/offers/route.ts:175`: `const body = await request.json().catch(() => ({}));`
- `app/api/venue/photo-vault/route.ts:85`: `const body = await request.json().catch(() => ({}));`
- `app/api/venue/photo-vault/route.ts:181`: `const body = await request.json().catch(() => ({}));`

### 2.8 Pattern: `dangerouslySetInnerHTML | eval\( | new Function`
Total Hits: 2

**`scratch/run-forensic-greps.mjs:129`**
```typescript
  128: 
  129: // 8. dangerouslySetInnerHTML | eval\( | new Function
  130: results.g8_dangerous_eval = grepLines(/dangerouslySetInnerHTML|eval\(|new Function/);
```

**`scratch/run-forensic-greps.mjs:130`**
```typescript
  129: // 8. dangerouslySetInnerHTML | eval\( | new Function
  130: results.g8_dangerous_eval = grepLines(/dangerouslySetInnerHTML|eval\(|new Function/);
  131: 
```

### 2.9 Pattern: `console\.(log|error)` near phone|pin|token|password|utr
Total Hits: 6

**`app/api/host/profile/route.ts:157`**
```typescript
  156:       if (businessError) {
  157:         console.error('[API Profile PATCH] Failed to save Master PIN:', businessError);
  158:         throw new Error(`Failed to save Master PIN: ${businessError.message}`);
```

**`app/api/host/staff/verify-pin/route.ts:22`**
```typescript
  21:   } catch (error: any) {
  22:     console.error('[API Staff Verify PIN Error]', error);
  23:     return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
```

**`lib/services/wallet/fee-guard.service.ts:61`**
```typescript
  60:   if (!supabaseClient) {
  61:     console.warn('[FeeGuard] No supabaseClient provided — skipping fee check');
  62:     return { allowed: true, cost: 0 };
```

**`scratch/diag-deduction.mjs:30`**
```typescript
  29:   if (balanceBefore <= 0) {
  30:     console.log('\n⚠️  Balance is ₹0 — topping up ₹50 first...');
  31:     const topup = await fetch(`${BASE}/api/host/wallet`, {
```

**`scratch/test-topup-approval-pipeline.mjs:18`**
```typescript
  17:   const testUtr = `UTR-${Date.now().toString().slice(-8)}`;
  18:   console.log(`\n2. Submitting Manual UTR Top-Up Request (UTR: ${testUtr}, Amount: ₹1000, Requested Plan: 12k_6m)...`);
  19:   const submitRes = await fetch(`${BASE_URL}/api/host/wallet`, {
```

**`test-wallet-paygo-flow.js:31`**
```typescript
  30:   // STEP 3: Top-up wallet to ensure funds
  31:   console.log('\n3️⃣ Topping up wallet with ₹100...');
  32:   const topupRes = await fetch(`${BASE_URL}/api/host/wallet`, {
```

### 2.10 Pattern: `localStorage|sessionStorage` near pin|token|session|wallet
Total Hits: 14

**`components/guest/lobby/LobbyUsernameModal.tsx:40`**
```typescript
  39:       localStorage.setItem('guest_name', cleanName);
  40:       localStorage.setItem('quad_guest_wallet_id', cleanHandle);
  41:       const sessionId = `GS-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
```

**`components/guest/lobby/useGuestWallet.ts:25`**
```typescript
  24:     const name = rawName && rawName !== 'Guest' ? rawName : undefined;
  25:     let walletId = localStorage.getItem('quad_guest_wallet_id');
  26:     if (!walletId) {
```

**`components/guest/lobby/useGuestWallet.ts:28`**
```typescript
  27:       walletId = `gw-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  28:       localStorage.setItem('quad_guest_wallet_id', walletId);
  29:     }
```

**`components/guest/menu/guest-identity.util.ts:32`**
```typescript
  31:   localStorage.setItem('guest_handle', profile.handle);
  32:   localStorage.setItem('quad_guest_wallet_id', profile.handle);
  33:   localStorage.setItem('quad_guest_phone', profile.phone);
```

**`components/guest/menu/hooks/useGuestContactInfo.ts:26`**
```typescript
  25:     if (typeof window !== 'undefined') {
  26:       return localStorage.getItem('guest_handle') || localStorage.getItem('quad_guest_wallet_id') || '';
  27:     }
```

**`components/guest/menu/hooks/useGuestContactInfo.ts:61`**
```typescript
  60:       localStorage.setItem('guest_handle', cleanHandle);
  61:       localStorage.setItem('quad_guest_wallet_id', cleanHandle);
  62:       setGuestHandleInput(cleanHandle);
```

**`components/guest/menu/hooks/useGuestOrderDispatch.ts:31`**
```typescript
  30:         localStorage.setItem('guest_handle', cleanHandle);
  31:         localStorage.setItem('quad_guest_wallet_id', cleanHandle);
  32:       }
```

**`components/guest/menu/hooks/useGuestOrderDispatch.ts:33`**
```typescript
  32:       }
  33:       const rawStored = typeof window !== 'undefined' ? localStorage.getItem('guest_handle') || localStorage.getItem('quad_guest_wallet_id') || undefined : undefined;
  34:       const guestHandle = handle?.trim() ? (handle.trim().startsWith('@') ? handle.trim() : `@${handle.trim()}`) : rawStored;
```

**`components/host/wallet/hooks/useWalletWorkspace.ts:8`**
```typescript
  7:   try {
  8:     const raw = sessionStorage.getItem(`quad_wallet_${venueId}`);
  9:     if (raw) return JSON.parse(raw);
```

**`components/host/wallet/hooks/useWalletWorkspace.ts:37`**
```typescript
  36:         try {
  37:           sessionStorage.setItem(`quad_wallet_${venueId}`, JSON.stringify({
  38:             wallet: json.wallet,
```

**`lib/store/guest-lobby.store.ts:112`**
```typescript
  111:         if (session) {
  112:           localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  113:         } else {
```

**`rules.md:66`**
```typescript
  65: ### 3.4 No Fragile LocalStorage Overrides for Ground Truth
  66: - `localStorage` must never be used as the authoritative source of truth for bill balances, session status, or KOT progress.
  67: - Transactional state must always be fetched from and verified against the PostgreSQL database.
```

**`scratch/run-forensic-greps.mjs:135`**
```typescript
  134: 
  135: // 10. localStorage|sessionStorage near pin|token|session|wallet
  136: results.g10_storage_pii = grepLines(/(localStorage|sessionStorage).*?(pin|token|session|wallet)/i);
```

**`scratch/run-forensic-greps.mjs:136`**
```typescript
  135: // 10. localStorage|sessionStorage near pin|token|session|wallet
  136: results.g10_storage_pii = grepLines(/(localStorage|sessionStorage).*?(pin|token|session|wallet)/i);
  137: 
```

### 2.11 Pattern: `parseFloat|toFixed|Number\(` on money (subtotal, tax, total, balance, amount)
Total Hits: 248
- `app/api/guest/menu/route.ts:129`: `price: item.price ? Number(item.price) : 0,`
- `app/api/host/accommodations/history/route.ts:93`: `const categoryPrice = Number(log.room?.category?.price) || 0;`
- `app/api/host/accommodations/history/route.ts:96`: `const totalBilled = Number(log.total_billed_amount) || calculatedTariff;`
- `app/api/host/accommodations/rooms/route.ts:64`: `activeOrdersByRoom[ord.room_id].total += Number(ord.grand_total) || 0;`
- `app/api/host/accommodations/rooms/[id]/checkout/route.ts:50`: `const ordersTotal = fAndBOrders.reduce((acc, o) => acc + (Number(o.grand_total) || 0), 0);`
- `app/api/host/accommodations/rooms/[id]/checkout/route.ts:64`: `if (masterStayOrder && Number(masterStayOrder.grand_total) > 0) {`
- `app/api/host/accommodations/rooms/[id]/checkout/route.ts:65`: `const masterTotal = Number(masterStayOrder.grand_total);`
- `app/api/host/accommodations/rooms/[id]/checkout/route.ts:66`: `const roomRate = Number(room.category?.price) || 0;`
- `app/api/host/accommodations/rooms/[id]/checkout/route.ts:70`: `const roomRate = Number(room.category?.price) || 0;`
- `app/api/host/accommodations/rooms/[id]/checkout/route.ts:74`: `const p = Number(a.price) || 0;`
- `app/api/host/accommodations/rooms/[id]/checkout/route.ts:96`: `const p = Number(addon.price) || 0;`
- `app/api/host/accommodations/rooms/[id]/dossier/route.ts:79`: `const roomRate = Number(room.category?.price) || 0;`
- `app/api/host/accommodations/rooms/[id]/dossier/route.ts:97`: `const price = Number(a.price) || 0;`
- `app/api/host/accommodations/rooms/[id]/dossier/route.ts:105`: `const ordersSubtotal = roomServiceOrders.reduce((acc, o) => acc + (Number(o.grand_total || o.total_amount) || 0), 0);`
- `app/api/host/accommodations/rooms/[id]/orders/route.ts:49`: `const grandTotal = (orders || []).reduce((acc, ord) => acc + (Number(ord.grand_total) || 0), 0);`
- `app/api/host/accommodations/rooms/[id]/status/route.ts:167`: `const rate = Number(updatedRoom.category?.price) || 0;`
- `app/api/host/accommodations/rooms/[id]/status/route.ts:181`: `const p = Number(addon.price) || 0;`
- `app/api/host/analytics/eod-z-report/route.ts:83`: `const sub = Number(order.subtotal) || 0;`
- `app/api/host/analytics/eod-z-report/route.ts:84`: `const disc = Number(order.discount_amount) || 0;`
- `app/api/host/analytics/eod-z-report/route.ts:86`: `const tax = Number(order.tax_amount) || 0;`
- `app/api/host/analytics/eod-z-report/route.ts:107`: `const unitPrice = Number(item.price?.amountMinor || item.nightlyRate?.amountMinor || item.price || item.unitPrice || item.unit_price || 0);`
- `app/api/host/analytics/eod-z-report/route.ts:118`: `const unitPrice = Number(item.price?.amountMinor || item.nightlyRate?.amountMinor || item.price || item.unitPrice || item.unit_price || 0);`
- `app/api/host/catalog/auto-fill-images/route.ts:125`: `price: { amountMinor: Math.round(Number(updatedItem.price) * 100), currency: 'INR' },`
- `app/api/host/catalog/auto-fill-images/route.ts:132`: `nightlyRate: { amountMinor: Math.round(Number(updatedItem.price) * 100), currency: 'INR' },`
- `app/api/host/catalog/auto-fill-images/route.ts:142`: `price: { amountMinor: Math.round(Number(updatedItem.price) * 100), currency: 'INR' },`
- `app/api/host/catalog/bulk-insert/route.ts:61`: `price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,`
- `app/api/host/catalog/create/route.ts:140`: `price: { amountMinor: Number(item.price), currency: 'INR' },`
- `app/api/host/catalog/create/route.ts:147`: `nightlyRate: { amountMinor: Number(item.price), currency: 'INR' },`
- `app/api/host/catalog/update/route.ts:61`: `addons[addonIndex] = { ...addons[addonIndex], price: Number(price) };`
- `app/api/host/catalog/update/route.ts:136`: `price: parseFloat(price),`

### 2.12 Pattern: `new Date\( | toLocale | date-fns | dayjs` (Timezone Handling)
Total Hits: 319
- `app/api/admin/reset-balance/route.ts:18`: `.update({ balance: targetBalance, updated_at: new Date().toISOString() })`
- `app/api/admin/reset-balance/route.ts:25`: `.update({ plan_tier: targetPlanTier, updated_at: new Date().toISOString() })`
- `app/api/guest/call-staff/route.ts:17`: `created_at: new Date().toISOString(),`
- `app/api/guest/lobby/route.ts:89`: `created_at: new Date().toISOString(),`
- `app/api/guest/lobby/route.ts:129`: `created_at: new Date().toISOString(),`
- `app/api/guest/lobby/route.ts:182`: `created_at: new Date().toISOString(),`
- `app/api/guest/onboard/route.ts:46`: `const nowIso = new Date().toISOString();`
- `app/api/guest/onboard/route.ts:134`: `created_at: new Date().toISOString(),`
- `app/api/guest/reviews/route.ts:33`: `? new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })`
- `app/api/guest/reviews/route.ts:70`: `const nowIso = new Date().toISOString();`
- `app/api/guest/wallet/redeem/route.ts:47`: `new Date(rec.expires_at).getTime() > Date.now()`
- `app/api/host/accommodations/rooms/[id]/checkout/route.ts:55`: `const checkIn = new Date(room.check_in_time || room.check_in_date).getTime();`
- `app/api/host/accommodations/rooms/[id]/checkout/route.ts:83`: `const nowIso = new Date().toISOString();`
- `app/api/host/accommodations/rooms/[id]/dossier/route.ts:84`: `const checkIn = new Date(room.check_in_time || room.check_in_date).getTime();`
- `app/api/host/accommodations/rooms/[id]/dossier/route.ts:86`: `? new Date(room.check_out_time || room.check_out_date).getTime()`
- `app/api/host/accommodations/rooms/[id]/status/route.ts:64`: `const nowIso = new Date().toISOString();`
- `app/api/host/accommodations/rooms/[id]/status/route.ts:86`: `updatePayload.check_out_date = new Date().toISOString();`
- `app/api/host/accommodations/rooms/[id]/status/route.ts:87`: `updatePayload.check_out_time = new Date().toISOString();`
- `app/api/host/accommodations/rooms/[id]/status/route.ts:124`: `.update({ check_out_time: new Date().toISOString() })`
- `app/api/host/accommodations/rooms/[id]/status/route.ts:239`: `created_at: updatePayload.check_in_time || new Date().toISOString()`
- `app/api/host/analytics/eod-z-report/route.ts:35`: `startDate = new Date(startDateParam);`
- `app/api/host/analytics/eod-z-report/route.ts:36`: `endDate = new Date(endDateParam);`
- `app/api/host/analytics/eod-z-report/route.ts:40`: `startDate = new Date(dateParam);`
- `app/api/host/analytics/eod-z-report/route.ts:42`: `endDate = new Date(dateParam);`
- `app/api/host/analytics/eod-z-report/route.ts:46`: `startDate = new Date();`

### 2.13 Pattern: `withIdempotency\(` -> Every call site + key construction
Total Hits: 9

**`app/api/guest/order/route.ts:37`**
```typescript
  36: 
  37:     const { response, status } = await withIdempotency(key, async () => {
  38:       const result = await placeGuestOrder(body, supabase);
```

**`app/api/guest/wallet/redeem/route.ts:17`**
```typescript
  16: 
  17:     const { response, status } = await withIdempotency(key, async () => {
  18:       const result = await createRedemptionRequest(supabase, body);
```

**`app/api/host/sessions/route.ts:70`**
```typescript
  69: 
  70:     const { response, status } = await withIdempotency(key, async () => {
  71:       const { invoiceRefFromId, generateInvoiceRef, evaluateFeeGuard } = await import('@/lib/services/wallet/fee-guard.service');
```

**`app/api/host/wallet/redeem/route.ts:13`**
```typescript
  12: 
  13:     const { response, status } = await withIdempotency(key, async () => {
  14:       const result = await verifyRedemptionCode(supabase, body);
```

**`architecture.md:112`**
```typescript
  111:                           v
  112:          [withIdempotency() Sliding Window (2,000ms)]
  113:              /                              \
```

**`architecture.md:120`**
```typescript
  119: 1. **Client-Side Submit Locks**: High-risk dispatch triggers (`useGuestOrderDispatch`, `useBillingSettlement`) employ React `useRef` locks (`isSubmittingRef`, `isSettlingRef`) to immediately block rapid tap sequences before network dispatch.
  120: 2. **Backend Sliding-Window Idempotency**: Critical endpoints (`/api/guest/order`, `/api/host/sessions`, `/api/guest/wallet/redeem`, `/api/host/wallet/redeem`) pass through `withIdempotency(key, handler, 2000)`. Duplicate submissions within a 2-second window are trapped and rejected with HTTP `409 Conflict`.
  121: 3. **Database-Level Row Locks**: `SELECT ... FOR UPDATE` row locks in `deduct_venue_wallet_credits` and `deduct_recipe_inventory_for_order` guarantee strict serializability for monetary balances and inventory stock counts.
```

**`audit-api-backend.md:44`**
```typescript
  43:     // 1. Sliding-window idempotency check (2,000ms window)
  44:     return await withIdempotency(req, async () => {
  45:       // 2. Input validation
```

**`audit-api-backend.md:81`**
```typescript
  80: 
  81: - [x] All mutation handlers pass through `withIdempotency()` to reject double-clicks.
  82: - [x] Standardized `{ success, data, error, code }` envelope enforced across all routes.
```

**`audit-rate-limiting.md:32`**
```typescript
  31: 
  32: export async function withIdempotency(
  33:   req: Request,
```

### 2.14 Pattern: `setInterval|setTimeout` in API / Server Code
Total Hits: 3

**`lib/services/api-idempotency.util.ts:14`**
```typescript
  13: // Auto-cleanup expired keys every 30 seconds
  14: if (typeof setInterval !== 'undefined') {
  15:   setInterval(() => {
```

**`lib/services/api-idempotency.util.ts:15`**
```typescript
  14: if (typeof setInterval !== 'undefined') {
  15:   setInterval(() => {
  16:     const now = Date.now();
```

**`lib/services/session/settle-session.service.ts:177`**
```typescript
  176:       if (typeof supabase.removeChannel === 'function') {
  177:         setTimeout(() => { void supabase.removeChannel(channel); }, 500);
  178:       }
```

### 2.15 Pattern: `revalidate|cache:|dynamic =` in Route Handlers
Total Hits: 24

**`app/api/admin/reset-balance/route.ts:5`**
```typescript
  4: 
  5: export const dynamic = 'force-dynamic';
  6: 
```

**`app/api/admin/topup-requests/route.ts:10`**
```typescript
  9: 
  10: export const dynamic = 'force-dynamic';
  11: 
```

**`app/api/host/accommodations/categories/route.ts:10`**
```typescript
  9: 
  10: export const dynamic = 'force-dynamic';
  11: 
```

**`app/api/host/accommodations/history/route.ts:6`**
```typescript
  5: 
  6: export const dynamic = 'force-dynamic';
  7: 
```

**`app/api/host/accommodations/rooms/route.ts:4`**
```typescript
  3: 
  4: export const dynamic = 'force-dynamic';
  5: 
```

**`app/api/host/accommodations/rooms/[id]/checkout/route.ts:4`**
```typescript
  3: 
  4: export const dynamic = 'force-dynamic';
  5: 
```

**`app/api/host/accommodations/rooms/[id]/dossier/route.ts:4`**
```typescript
  3: 
  4: export const dynamic = 'force-dynamic';
  5: 
```

**`app/api/host/accommodations/rooms/[id]/orders/route.ts:4`**
```typescript
  3: 
  4: export const dynamic = 'force-dynamic';
  5: 
```

**`app/api/host/accommodations/rooms/[id]/status/route.ts:5`**
```typescript
  4: 
  5: export const dynamic = 'force-dynamic';
  6: 
```

**`app/api/host/catalog/recipe/route.ts:4`**
```typescript
  3: 
  4: export const dynamic = 'force-dynamic';
  5: 
```

**`app/api/host/expenses/advances/route.ts:4`**
```typescript
  3: 
  4: export const dynamic = 'force-dynamic';
  5: 
```

**`app/api/host/expenses/bills/route.ts:4`**
```typescript
  3: 
  4: export const dynamic = 'force-dynamic';
  5: 
```

**`app/api/host/expenses/staff/route.ts:4`**
```typescript
  3: 
  4: export const dynamic = 'force-dynamic';
  5: 
```

**`app/api/host/profile/route.ts:4`**
```typescript
  3: 
  4: export const dynamic = 'force-dynamic';
  5: 
```

**`app/api/host/profile/route.ts:100`**
```typescript
  99:       headers: {
  100:         'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  101:         'Pragma': 'no-cache',
```

**`app/api/host/profile/route.ts:164`**
```typescript
  163:       headers: {
  164:         'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
  165:       }
```

**`app/api/host/profile/update/route.ts:5`**
```typescript
  4: 
  5: export const dynamic = 'force-dynamic';
  6: 
```

**`app/api/host/profile/update/route.ts:194`**
```typescript
  193:       headers: {
  194:         'Cache-Control': 'no-store, no-cache, must-revalidate'
  195:       }
```

**`app/api/host/security/status/route.ts:5`**
```typescript
  4: 
  5: export const dynamic = 'force-dynamic';
  6: 
```

**`app/api/host/security/status/route.ts:81`**
```typescript
  80:       headers: {
  81:         'Cache-Control': 'no-store, no-cache, must-revalidate',
  82:         'Pragma': 'no-cache',
```

**`app/api/host/sessions/fee/route.ts:5`**
```typescript
  4: 
  5: export const dynamic = 'force-dynamic';
  6: 
```

**`app/api/host/staff/verify-pin/route.ts:5`**
```typescript
  4: 
  5: export const dynamic = 'force-dynamic';
  6: 
```

**`app/api/host/wallet/outstanding/route.ts:4`**
```typescript
  3: 
  4: export const dynamic = 'force-dynamic';
  5: 
```

**`app/api/host/wallet/route.ts:11`**
```typescript
  10: 
  11: export const dynamic = 'force-dynamic';
  12: 
```
