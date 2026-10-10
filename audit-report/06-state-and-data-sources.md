# 06 State and Data Sources

This report inventories state that lives outside of Postgres.

## Module-level Variables (Server-Side Memory Leaks / Cold Starts)
*Verdict: MOVE-TO-DB or REDIS (Vercel serverless kills these between requests).* 
- lib/services/wallet/cashback-ledger.util.ts:45 -> export const inMemoryWallets = new Map<string, GuestWalletRecord>();
- lib/services/wallet/cashback-ledger.util.ts:46 -> export const inMemoryTransactions = new Map<string, WalletTransactionRecord[]>();
- lib/services/wallet/wallet-memory.store.ts:8 -> export const mem = new Map<

## Realtime Channels
- components/guest/lobby/lobby-realtime.service.ts:24 -> await supabase.channel('room:lobby').send({
- components/guest/lobby/lobby-realtime.service.ts:48 -> await supabase.channel('room:lobby').send({
- components/guest/lobby/lobby-realtime.service.ts:83 -> await supabase.channel('room:lobby').send({
- components/guest/lobby/lobby-realtime.service.ts:102 -> await supabase.channel('room:lobby').send({
- components/guest/lobby/useGuestLobbyRealtime.ts:65 -> const channel = supabase.channel('room:lobby', {
- components/guest/lobby/useSocialFeed.ts:144 -> .channel(`realtime-lobby-messages-${cafeId || 'default'}`)
- components/guest/lobby/VenueLiveOffers.tsx:49 -> .channel(`venue_live_offers_${venueId}`)
- components/guest/lobby/VenuePhotoVault.tsx:94 -> .channel(`venue_photo_vault_${venueId}`)
- components/guest/menu/hooks/useGuestRealtimeSync.ts:52 -> const sessionCh = supabase.channel(`guest-session-sync-${tableNumber}`)
- components/guest/menu/hooks/useGuestRealtimeSync.ts:73 -> const kitchenCh = supabase.channel('realtime_kitchen')
- components/host/control-center/usePendingKot.ts:29 -> .channel('global_kot_dot')
- components/host/workspaces/billing/hooks/settlement-helper.util.ts:10 -> const channel = supabase.channel(`guest-session-sync-${tableNumber}`);
- components/host/workspaces/billing/hooks/usePOSTables.ts:202 -> .channel('realtime_pos_sessions')
- components/host/workspaces/billing/hooks/useTableManagement.ts:51 -> .channel('table_mgmt_realtime')
- components/host/workspaces/dashboard/useDashboardWorkspace.ts:43 -> const channel = supabase.channel('realtime_dashboard')
- components/host/workspaces/kitchen/hooks/useKitchenStatusUpdate.ts:44 -> const channel = supabase.channel('realtime_kitchen');
- components/host/workspaces/kitchen/hooks/useKitchenTickets.ts:35 -> const ch = sb.channel('realtime_kitchen').on('postgres_changes', { event: '*', schema: 'public', table: 'kitchen_tickets' }, (p) => {
- lib/hooks/use-kitchen-realtime.ts:92 -> .channel(channelName)
- lib/services/session/settle-session.service.ts:199 -> const channel = supabase.channel(`guest-session-sync-${rawTable}`);
- scripts/test-kitchen-realtime.mjs:15 -> .channel(`test-kitchen-realtime-${Date.now()}`)

## Stores & Broadcast
- components/guest/menu/hooks/useGuestRealtimeSync.ts:42 -> BroadcastChannel
- components/host/workspaces/billing/hooks/settlement-helper.util.ts:4 -> BroadcastChannel
- components/host/workspaces/kitchen/hooks/useKitchenStatusUpdate.ts:32 -> BroadcastChannel
- lib/store/cart.store.ts:71 -> Zustand store
- lib/store/drawer.store.ts:7 -> Zustand store
- lib/store/guest-lobby.store.ts:95 -> Zustand store
- lib/store/host-workspace.store.ts:28 -> Zustand store

## Polling Loops (setInterval)
- components/guest/lobby/useGuestWallet.ts:74 -> const interval = setInterval(fetchWallet, 15000);
- components/guest/lobby/useTypewriter.ts:16 -> const id = setInterval(() => {
- components/guest/menu/hooks/useGuestOrderPolling.ts:58 -> const interval = setInterval(checkStatus, intervalMs);
- components/guest/menu/hooks/useGuestOrderPolling.ts:77 -> const interval = setInterval(runPoll, intervalMs);
- components/host/control-center/useBillRequests.ts:59 -> const interval = setInterval(checkBillRequests, 6000);
- components/host/control-center/usePendingKot.ts:25 -> const timer = setInterval(() => fetchPending(), 5000);
- components/host/wallet/hooks/useWalletWorkspace.ts:54 -> const poll = setInterval(fetchWalletData, 15_000);
- components/host/wallet/OutstandingBillingSection.tsx:40 -> const poll = setInterval(load, 20_000);
- components/host/workspaces/billing/hooks/useBillRequests.ts:27 -> const interval = window.setInterval(loadRequests, 4000);
- components/host/workspaces/billing/hooks/usePOSTables.ts:196 -> const intervalId = setInterval(() => {
- components/kitchen/KitchenBoard.tsx:94 -> const timer = setInterval(() => setNowMs(Date.now()), 30000);
- lib/middleware/rate-limiter.ts:23 -> if (typeof setInterval !== 'undefined') {
- lib/middleware/rate-limiter.ts:24 -> setInterval(() => {
- lib/services/api-idempotency.util.ts:14 -> if (typeof setInterval !== 'undefined') {
- lib/services/api-idempotency.util.ts:15 -> setInterval(() => {
- scratch/format-part-c.mjs:233 -> md += `\n### 2.14 Pattern: \`setInterval|setTimeout\` in API / Server Code
- scratch/run-forensic-greps.mjs:147 -> // 14. setInterval|setTimeout in API/server code
- scratch/run-forensic-greps.mjs:148 -> results.g14_timers_in_server = grepLines(/setInterval|setTimeout/, (f) => f.startsWith('app/api/') || f.startsWith('lib/services/'));
