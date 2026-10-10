# PART B — TIER 2 CODE EXTRACTION (Hooks, Pages & Data-Fetching Components)

Policy: Full verbatim if <150 lines, else first 150 lines + all exported signatures. Sensitive keys replaced with `[REDACTED]`.

---

## 1. Key Action Hooks & Realtime Subscriptions

### components/guest/menu/hooks/useGuestOrderDispatch.ts (88 lines)
```typescript
'use client';

import { useState, useRef } from 'react';

export function useGuestOrderDispatch(p: {
  tableNumber: string; cafeParam: string; guestId: string; activeSession: any;
  currentGuestName: string; cartItems: any[]; masterOrder: any; clearCart: () => void;
  showToast: (m: string) => void; setSentItems: (it: any[]) => void; setMasterOrder: (o: any) => void;
  setKotStatus: (s: string) => void; setTicketNumber: (t: string) => void;
  setIsRecentAddon: (b: boolean) => void; setBillRequestedBanner: (b: boolean) => void;
  resetSettledState?: () => void;
}) {
  const [isSendingToKitchen, setIsSendingToKitchen] = useState(false);
  const [isRequestingBill, setIsRequestingBill] = useState(false);
  const isSubmittingRef = useRef(false);

  const handlePlaceOrder = async (name: string, phone: string, notes: string, cb: (addon: boolean) => void, handle?: string) => {
    if (p.cartItems.length === 0 || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSendingToKitchen(true);
    p.resetSettledState?.();
    try {
      if (name.trim() && typeof window !== 'undefined') {
        localStorage.setItem('quad_guest_name', name.trim());
        localStorage.setItem('guest_name', name.trim());
      }
      if (phone.trim() && typeof window !== 'undefined') localStorage.setItem('quad_guest_phone', phone.trim());
      if (handle?.trim() && typeof window !== 'undefined') {
        const cleanHandle = handle.trim().startsWith('@') ? handle.trim() : `@${handle.trim()}`;
        localStorage.setItem('guest_handle', cleanHandle);
        localStorage.setItem('quad_guest_wallet_id', cleanHandle);
      }
      const rawStored = typeof window !== 'undefined' ? localStorage.getItem('guest_handle') || localStorage.getItem('quad_guest_wallet_id') || undefined : undefined;
      const guestHandle = handle?.trim() ? (handle.trim().startsWith('@') ? handle.trim() : `@${handle.trim()}`) : rawStored;

      if (guestHandle && p.cafeParam) {
        fetch(`/api/guest/wallet?guest_id=${encodeURIComponent(guestHandle)}&cafe_id=${encodeURIComponent(p.cafeParam)}`).catch(() => {});
      }

      const payload = {
        session_id: p.activeSession?.id || p.guestId,
        order_id: p.masterOrder?.id || p.activeSession?.active_order_id || `ord_${Date.now()}`,
        table_number: p.tableNumber, business_id: p.activeSession?.business_id || p.cafeParam,
        cafe_id: p.cafeParam, guest_name: name.trim() || p.currentGuestName || 'Guest', guest_phone: phone.trim() || undefined,
        guest_handle: guestHandle,
        items: p.cartItems.map((c) => ({
          id: c.item_id, item_id: c.item_id, name: c.name, price: c.total_item_price, quantity: c.quantity,
          notes: [(c.selected_addons || []).map((a: any) => `${a.name} (+₹${a.price})`).join(', '), c.notes, notes].filter(Boolean).join(' | ') || undefined,
        })),
      };
      const res = await fetch('/api/guest/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) {
        p.resetSettledState?.();
        try {
          const { useGuestLobbyStore } = await import('@/lib/store/guest-lobby.store');
          useGuestLobbyStore.getState().setSessionSettled(false);
        } catch {}
        p.clearCart(); p.setSentItems(data.items || []);
        if (data.order) p.setMasterOrder(data.order);
        if (data.kot_status) p.setKotStatus(data.kot_status);
        if (data.ticket?.ticket_number) p.setTicketNumber(data.ticket.ticket_number);
        p.setIsRecentAddon(Boolean(data.is_addon));
        cb(Boolean(data.is_addon));
        p.showToast(data.is_addon ? 'Items appended to KOT — Chef notified' : 'Order dispatched to kitchen — Live tracker active');
      } else { p.showToast(data.error || 'Failed to dispatch order.'); }
    } catch { p.showToast('Network error dispatching order.'); } finally {
      setIsSendingToKitchen(false);
      setTimeout(() => { isSubmittingRef.current = false; }, 1500);
    }
  };

  const handleRequestBill = async () => {
    setIsRequestingBill(true);
    try {
      const res = await fetch('/api/guest/session', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: p.activeSession?.id, table_number: p.tableNumber, business_id: p.activeSession?.business_id || p.cafeParam, cafe_id: p.cafeParam, action: 'request_bill', status: 'bill_requested' }),
      });
      const data = await res.json();
      if (data.success) { p.setBillRequestedBanner(true); p.showToast('Final bill requested — Captain & Host alerted.'); }
      else { p.showToast(data.error || 'Failed to request bill.'); }
    } catch { p.showToast('Network error requesting bill.'); } finally { setIsRequestingBill(false); }
  };

  return { isSendingToKitchen, handlePlaceOrder, isRequestingBill, handleRequestBill };
}

```

### components/host/workspaces/billing/hooks/useBillingSettlement.ts (66 lines)
```typescript
import { useRef } from 'react';
import type { InvoiceData } from '../InvoicePreviewModal';
import { broadcastTableSettled, triggerTakeawayBillingFee, dispatchWalletRefreshEvents, clearOrderIdUrlParam } from './settlement-helper.util';

interface UseBillingSettlementProps {
  cart: any;
  markTableVacant: (tableId: string, backendAlreadyUpdated?: boolean) => Promise<any>;
  fetchTables: () => Promise<any>;
  setInvoicePreview: (invoice: InvoiceData | null) => void;
  setSuccessMessage: (message: string) => void;
}

export function useBillingSettlement({
  cart, markTableVacant, fetchTables, setInvoicePreview, setSuccessMessage,
}: UseBillingSettlementProps) {
  const isSettlingRef = useRef(false);

  return async (onHistoryRefresh?: () => void) => {
    if (isSettlingRef.current) return;
    isSettlingRef.current = true;
    const { selectedTableId: tableId, selectedTableNumber: tableNumber, activeSessionId: sessionId } = cart;
    const isTableOrder = Boolean(sessionId || tableId || (tableNumber && tableNumber !== 'Takeaway / Counter'));

    try {
      if (isTableOrder) {
        const response = await fetch('/api/host/sessions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId, order_id: cart.linkedOrderId, table_id: tableId, table_number: tableNumber,
            action: 'settle_and_vacate', final_items: cart.selectedItems, subtotal: cart.subtotal,
            tax_amount: cart.gstAmount, grand_total: cart.grandTotal, discount_amount: cart.discountAmount,
            discount_type: cart.discountType, discount_value: cart.discountValue,
            redemption_code: cart.redemptionCode || undefined,
            idempotency_key: `settle_${sessionId || tableId || tableNumber}_${Date.now()}`,
          }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Table settlement failed.');
        await broadcastTableSettled(tableNumber, cart.grandTotal);
      } else {
        await triggerTakeawayBillingFee(cart.linkedOrderId);
      }

      dispatchWalletRefreshEvents();
      setInvoicePreview(null);
      cart.resetCart();
      if (tableId || (tableNumber && tableNumber !== 'Takeaway / Counter')) {
        await markTableVacant(tableId || tableNumber, isTableOrder);
      } else {
        await fetchTables();
      }
      setSuccessMessage(sessionId ? 'Bill settled. Table is now vacant.' : 'Bill saved and finalized successfully');
      window.setTimeout(() => setSuccessMessage(''), 3500);
      clearOrderIdUrlParam();
      onHistoryRefresh?.();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Settlement sync failed. Please retry.';
      console.error('[useBillingSettlement] Fatal settlement error:', errMsg, error);
      setSuccessMessage(`⚠️ ${errMsg}`);
      window.setTimeout(() => setSuccessMessage(''), 6000);
    } finally {
      isSettlingRef.current = false;
    }
  };
}
```

### components/guest/lobby/useGuestLobbyRealtime.ts (284 lines)
```typescript
'use client';

import { useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  useGuestLobbyStore,
  LobbyPresenceUser,
  DynamicIslandNotificationItem,
  PrivateChatMessage,
  LobbyPublicMessage,
} from '@/lib/store/guest-lobby.store';
import {
  broadcastInvitation,
  broadcastInvitationResponse,
  broadcastChatMessage,
  broadcastLobbyMessage,
} from './lobby-realtime.service';

interface UseGuestLobbyRealtimeProps {
  currentSessionId: string;
  currentUserName: string;
  currentUserTable: string;
}

export function useGuestLobbyRealtime({
  currentSessionId,
  currentUserName,
  currentUserTable,
}: UseGuestLobbyRealtimeProps) {
  const {
    onlineUsers,
    setOnlineUsers,
    notifications,
    addNotification,
    removeNotification,
    activeChat,
    setActiveChat,
    addChatMessage,
    lobbyMessages,
    setLobbyMessages,
    addLobbyMessage,
  } = useGuestLobbyStore();

  useEffect(() => {
    let supabase: any;
    try {
      supabase = createClient();
    } catch {}

    if (!supabase) {
      setOnlineUsers([]);
      return;
    }

    // ── Vector 3: Stale-state cleanup on table-hop / identity change ──
    // Clear presence immediately when session/table identity changes to prevent
    // one table's guests bleeding into another table's UI state.
    setOnlineUsers([]);

    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isUnmounted = false;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;

    const channel = supabase.channel('room:lobby', {
      config: { presence: { key: currentSessionId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const activeList: LobbyPresenceUser[] = [];

        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.session_id && p.session_id !== currentSessionId) {
              activeList.push(p);
            }
          });
        });

        setOnlineUsers(activeList);
      })
      .on('broadcast', { event: 'invitation' }, ({ payload }: any) => {
        if (
          payload.receiver_table === currentUserTable ||
          payload.receiver_session_id === currentSessionId
        ) {
          addNotification({
            id: payload.id || `notif-${Date.now()}`,
            sender_session_id: payload.sender_session_id,
            sender_name: payload.sender_name,
            sender_table: payload.sender_table,
            sender_avatar: payload.sender_avatar || '☕',
            receiver_table: currentUserTable,
            interaction_type: payload.interaction_type,
            custom_message: payload.custom_message,
            timestamp: Date.now(),
          });
        }
      })
      .on('broadcast', { event: 'invitation_response' }, ({ payload }: any) => {
        if (payload.sender_session_id === currentSessionId && payload.status === 'accepted') {
          setActiveChat({
            chat_id: payload.chat_id || `chat-${Date.now()}`,
            partner_name: payload.receiver_name,
            partner_table: payload.receiver_table,
            partner_avatar: '☕',
            partner_session_id: payload.receiver_session_id,
            messages: [
              {
                id: `init-${Date.now()}`,
                chat_id: payload.chat_id || `chat-${Date.now()}`,
                sender_session_id: payload.receiver_session_id,
                sender_name: payload.receiver_name,
                message: `Accepted your ${payload.interaction_type} request!`,
                created_at: new Date().toISOString(),
              },
            ],
          });
        }
      })
      .on('broadcast', { event: 'chat_message' }, ({ payload }: any) => {
        if (activeChat && activeChat.chat_id === payload.chat_id) {
          addChatMessage(payload);
        }
      })
      .on('broadcast', { event: 'lobby_message' }, ({ payload }: any) => {
        addLobbyMessage(payload);
      })
      .subscribe(async (status: string) => {
        if (isUnmounted) return;

        if (status === 'SUBSCRIBED') {
          reconnectAttempts = 0; // reset on successful connect
          await channel.track({
            session_id: currentSessionId,
            guest_name: currentUserName,
            avatar: '☕',
            table_number: currentUserTable,
            joinedAt: new Date().toISOString(),
          });
        }

        // ── Vector 2: WebSocket auto-reconnect with exponential backoff ──
        if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && !isUnmounted) {
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
            reconnectAttempts++;
            console.warn(`[LobbyRealtime] WebSocket ${status}. Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);

// ... [TRUNCATED TIER-2: 134 lines omitted. Exported Signatures Below:]
export function useGuestLobbyRealtime({
```

### components/host/workspaces/kitchen/hooks/useKitchenStatusUpdate.ts (66 lines)
```typescript
import { useCallback } from 'react';
import type { KitchenTicket } from '@/lib/utils/kitchen';
import { createClient } from '@/lib/supabase/client';

export function useKitchenStatusUpdate(
  setTickets: React.Dispatch<React.SetStateAction<KitchenTicket[]>>,
  fetchTickets: () => Promise<void>,
  cafeId?: string
) {
  const updateStatus = useCallback(async (id: string, newStatus: KitchenTicket['status']) => {
    const nowIso = new Date().toISOString();
    setTickets((prev) => {
      const target = prev.find((t) => t.id === id);
      if (!target) return prev;
      const previousTickets = [...prev];
      const updatedItems = (target.items || []).map((item) => {
        const u = { ...item };
        if (newStatus === 'PREPARING' && !u.started_at) u.started_at = nowIso;
        else if (newStatus === 'READY' && !u.ready_at) { u.ready_at = nowIso; u.completed = true; }
        else if (newStatus === 'SERVED' && !u.delivered_at) { u.delivered_at = nowIso; u.completed = true; }
        return u;
      });

      const payload = {
        id, ticket_number: target.ticket_number,
        table_or_room: target.table_or_room, table_number: target.table_or_room,
        order_id: target.order_id, status: newStatus,
      };

      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          new BroadcastChannel('quad_kitchen_sync').postMessage({ event: 'kot_status_update', payload });
        }
      } catch {}

      fetch('/api/host/kitchen/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus, items: updatedItems, business_id: cafeId }),
      }).then(async (res) => {
        if (!res.ok) throw new Error('Failed to update ticket');
        try {
          const supabase = createClient();
          const channel = supabase.channel('realtime_kitchen');
          channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              channel.send({ type: 'broadcast', event: 'kot_status_update', payload })
                .finally(() => { void supabase.removeChannel(channel); });
            }
          });
        } catch {}
      }).catch(() => {
        setTickets(previousTickets);
        try {
          window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: 'Sync failed: Restored ticket status' } }));
        } catch {}
        fetchTickets();
      });

      return prev.map((t) => (t.id === id ? { ...t, status: newStatus, items: updatedItems, updated_at: nowIso } : t));
    });
  }, [cafeId, fetchTickets, setTickets]);

  return { updateStatus };
}

```

### components/common/RealtimeHealthIndicator.tsx (44 lines)
```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, AlertCircle } from 'lucide-react';

export function RealtimeHealthIndicator() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOffline(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-900/95 border border-amber-500/30 text-amber-200 text-xs shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-300"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
      </span>
      <WifiOff className="w-3.5 h-3.5 text-amber-400" />
      <span className="font-mono text-[11px] font-medium tracking-tight">Live Sync Paused &bull; Reconnecting...</span>
    </div>
  );
}
export default RealtimeHealthIndicator;

```

### components/guest/menu/hooks/useGuestMenuSession.ts (79 lines)
```typescript
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useGuestLobbyStore } from '@/lib/store/guest-lobby.store';
import type { MenuItem } from '@/components/guest/menu/types';
import { getScopedGuestUuid, getStoredGuestProfile } from './guest-storage.util';
import { partitionMenuItems } from './menu-category.util';
import { fetchMenuAndInitSession } from './guest-menu-fetch.util';

export function useGuestMenuSession({ tableParam, cafeParam }: { tableParam: string; cafeParam: string }) {
  const { session, setSession, setSessionSettled } = useGuestLobbyStore();
  const [guestId, setGuestId] = useState('');
  const [activeSession, setActiveSession] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [businessName, setBusinessName] = useState(() => session?.business_name || '');
  const [tableNumber, setTableNumber] = useState(tableParam);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);

  const [initialOrder, setInitialOrder] = useState<any>(null);
  const [initialItems, setInitialItems] = useState<any[]>([]);
  const [initialBillRequested, setInitialBillRequested] = useState(false);
  const [initialKotStatus, setInitialKotStatus] = useState<string | null>(null);
  const [initialTicketNumber, setInitialTicketNumber] = useState<string | null>(null);
  const [initialBillSettled, setInitialBillSettled] = useState(false);
  const [initialSettledTotal, setInitialSettledTotal] = useState(0);

  useEffect(() => {
    setActiveSession(null); setInitialOrder(null); setInitialItems([]);
    setInitialBillRequested(false); setInitialKotStatus(null); setInitialTicketNumber(null);
    setIsLoadingMenu(true); setMenuError(null);

    const localId = getScopedGuestUuid(cafeParam, tableParam);
    const { customerId, guestName } = getStoredGuestProfile();
    setGuestId(localId);

    fetchMenuAndInitSession({
      tableParam, cafeParam, localId, customerId, guestName, avatar: session?.avatar || '☕',
      onMenuReady: (readyData) => {
        setMenuItems(readyData.items); setTableNumber(readyData.tableNumber);
        if (readyData.businessName) setBusinessName(readyData.businessName);
        setIsLoadingMenu(false);
      },
    }).then((res) => {
      setMenuItems(res.items); setTableNumber(res.tableNumber);
      if (res.businessName) setBusinessName(res.businessName);
      setActiveSession(res.session); setInitialOrder(res.order); setInitialItems(res.orderItems);
      setInitialBillRequested(res.isBillRequested); setInitialKotStatus(res.kotStatus); setInitialTicketNumber(res.ticketNumber);

      const hasActive = Boolean(res.order || (res.orderItems && res.orderItems.length > 0));

      if (hasActive) {
        setInitialBillSettled(false); setInitialSettledTotal(0); setSessionSettled(false);
      } else if (res.isSettled && res.settledTotal > 0) {
        setInitialBillSettled(true); setInitialSettledTotal(res.settledTotal); setSessionSettled(true);
      } else {
        setInitialBillSettled(false); setInitialSettledTotal(0); setSessionSettled(false);
      }

      setSession({
        customer_id: customerId || localId, session_id: localId, table_id: res.tableId,
        table_number: res.tableNumber, guest_name: guestName || 'Guest', avatar: session?.avatar || '☕',
        business_name: res.businessName || businessName, status: 'active',
        is_settled: hasActive ? false : Boolean(res.isSettled),
      });
    }).catch((err) => {
      setMenuItems((cur) => { if (!cur || cur.length === 0) setMenuError(err.message || 'Error loading table menu'); return cur; });
    }).finally(() => setIsLoadingMenu(false));
  }, [tableParam, cafeParam]);

  const { diningItems, venueServices, culinaryCategories } = useMemo(() => partitionMenuItems(menuItems), [menuItems]);

  return {
    guestId, activeSession, tableNumber, businessName, isLoadingMenu, menuError,
    diningItems, venueServices, culinaryCategories, initialOrder, initialItems,
    initialBillRequested, initialKotStatus, initialTicketNumber, initialBillSettled, initialSettledTotal,
  };
}

```

### components/guest/menu/hooks/useGuestOrderPolling.ts (83 lines)
```typescript
'use client';

import { useEffect, useCallback } from 'react';
import { normalizeTableIdentifier } from './order-totals.util';

interface PollingProps {
  tableNumber: string; cafeParam: string; guestId: string; activeSessionId?: string; hasActiveOrder: boolean; sentItemsCount: number;
  billRequestedBanner: boolean; markBillSettled: (t?: number) => void; setSentItems: (it: any[]) => void;
  setMasterOrder: (o: any) => void; setKotStatus: (s: string) => void; setTicketNumber: (t: string) => void; setBillRequestedBanner: (v: boolean) => void;
}

export function useGuestOrderPolling(p: PollingProps) {
  const normCur = normalizeTableIdentifier(p.tableNumber);

  const pollActiveOrder = useCallback(async () => {
    if (!p.tableNumber) return;
    try {
      const q = new URLSearchParams({ table: p.tableNumber });
      if (p.cafeParam) q.set('cafe_id', p.cafeParam);
      const res = await fetch(`/api/guest/order?${q.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (!data?.success) return;
      if (data.order?.table_number && normalizeTableIdentifier(data.order.table_number) !== normCur) return;
      if (data.is_settled || data.order?.status === 'settled') { p.markBillSettled(data.settled_total || data.order?.grand_total); return; }
      if (data.items) p.setSentItems(data.items);
      if (data.order) p.setMasterOrder(data.order);
      if (data.kot_status) p.setKotStatus(data.kot_status);
      if (data.ticket?.ticket_number) p.setTicketNumber(data.ticket.ticket_number);
      if (data.is_bill_requested) p.setBillRequestedBanner(true);
    } catch {}
  }, [p.tableNumber, p.cafeParam, normCur, p.markBillSettled, p.setSentItems, p.setMasterOrder, p.setKotStatus, p.setTicketNumber, p.setBillRequestedBanner]);

  const isPollingOrderRef = { current: false };
  const isCheckingStatusRef = { current: false };

  useEffect(() => {
    const statusId = p.activeSessionId || p.guestId;
    if (!statusId && !p.tableNumber) return;

    const checkStatus = async () => {
      if (isCheckingStatusRef.current) return;
      isCheckingStatusRef.current = true;
      try {
        const res = await fetch(`/api/guest/session?session_id=${encodeURIComponent(statusId)}&table_number=${encodeURIComponent(p.tableNumber)}`, { cache: 'no-store' });
        const data = await res.json();
        if (data.table_number && normalizeTableIdentifier(data.table_number) !== normCur) return;
        if (data.session_status === 'closed' && (p.hasActiveOrder || p.sentItemsCount > 0 || p.billRequestedBanner)) p.markBillSettled(data.settled_total);
        if (data.kot_status) p.setKotStatus(data.kot_status);
        if (data.ticket_number) p.setTicketNumber(data.ticket_number);
      } catch {} finally {
        isCheckingStatusRef.current = false;
      }
    };

    void checkStatus();
    // Active orders poll faster; idle tables poll at relaxed interval
    const intervalMs = (p.hasActiveOrder || p.sentItemsCount > 0 || p.billRequestedBanner) ? 4000 : 15000;
    const interval = setInterval(checkStatus, intervalMs);
    return () => clearInterval(interval);
  }, [p.activeSessionId, p.guestId, p.tableNumber, normCur, p.hasActiveOrder, p.sentItemsCount, p.billRequestedBanner, p.markBillSettled, p.setKotStatus, p.setTicketNumber]);

  useEffect(() => {
    if (!p.tableNumber) return;

    const runPoll = async () => {
      if (isPollingOrderRef.current) return;
      isPollingOrderRef.current = true;
      try {
        await pollActiveOrder();
      } finally {
        isPollingOrderRef.current = false;
      }
    };

    void runPoll();
    const intervalMs = (p.hasActiveOrder || p.sentItemsCount > 0 || p.billRequestedBanner) ? 3500 : 15000;
    const interval = setInterval(runPoll, intervalMs);
    return () => clearInterval(interval);
  }, [p.tableNumber, p.hasActiveOrder, p.sentItemsCount, p.billRequestedBanner, pollActiveOrder]);

  return { pollActiveOrder };
}

```

## 2. Key App Pages (Auth Gating & Data Fetching)

### app/host/dashboard/page.tsx (56 lines)
```typescript
'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { calculateProfileScore, generateUniqueHostId } from '@/lib/utils/hostUtils';
import type { BusinessLocation, FoodMenuItem, HostProfile, RoomTariffItem } from '@/types/host';
import ProfileHeader from '@/components/host/ProfileHeader';
import PropertyBranches from '@/components/host/PropertyBranches';
import ServiceCatalog from '@/components/host/ServiceCatalog';

const fallbackImage = '/images/neuron-structure.jpg';
type ProvisioningPayload = { host?: Partial<HostProfile>; businesses?: BusinessLocation[] };

export default function HostDashboard() {
  const [profile, setProfile] = useState<HostProfile>({ hostId: generateUniqueHostId(), fullName: 'Host Owner', role: 'Host / Owner', phone: '', email: '', gender: '', dob: '', bio: '', categories: ['Cafe'] });
  const [businesses, setBusinesses] = useState<BusinessLocation[]>([]);
  const [foodMenu, setFoodMenu] = useState<FoodMenuItem[]>([]);
  const [roomTariffs, setRoomTariffs] = useState<RoomTariffItem[]>([]);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [foodOpen, setFoodOpen] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);
  const [newFood, setNewFood] = useState({ name: '', category: 'Mains', price: '', description: '', imageUrl: '', addons: '' });
  const [newRoom, setNewRoom] = useState({ title: '', category: 'Luxury Suite', tariffPerNight: '', maxGuests: '2', imageUrl: '', addons: '' });

  useEffect(() => {
    const stored = sessionStorage.getItem('quad-provisioning');
    if (!stored) return;
    try {
      const payload = JSON.parse(stored) as ProvisioningPayload;
      if (payload.host) setProfile((current) => ({ ...current, ...payload.host, hostId: current.hostId }));
      if (payload.businesses?.length) setBusinesses(payload.businesses);
    } catch { sessionStorage.removeItem('quad-provisioning'); }
  }, []);

  function addFood(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newFood.name || !newFood.price) return;
    setFoodMenu((items) => [...items, { id: `food_${Date.now()}`, name: newFood.name, category: newFood.category, price: Number(newFood.price), description: newFood.description, imageUrl: newFood.imageUrl || fallbackImage, addons: newFood.addons }]);
    setNewFood({ name: '', category: 'Mains', price: '', description: '', imageUrl: '', addons: '' });
    setFoodOpen(false);
  }
  function addRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newRoom.title || !newRoom.tariffPerNight) return;
    setRoomTariffs((items) => [...items, { id: `room_${Date.now()}`, title: newRoom.title, category: newRoom.category, tariffPerNight: Number(newRoom.tariffPerNight), maxGuests: Number(newRoom.maxGuests) || 2, imageUrl: newRoom.imageUrl || fallbackImage, addons: newRoom.addons }]);
    setNewRoom({ title: '', category: 'Luxury Suite', tariffPerNight: '', maxGuests: '2', imageUrl: '', addons: '' });
    setRoomOpen(false);
  }

  const completionScore = calculateProfileScore(profile, businesses, foodMenu, roomTariffs);
  return <div className="light-shell min-h-screen bg-white pb-20 text-black selection:bg-black selection:text-white">
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-zinc-950 px-5 py-4 md:px-8"><div className="flex items-center gap-3"><span className="font-serif text-xl">Quad Computing</span><span className="hidden border border-white/20 px-3 py-1 text-[10px] uppercase tracking-widest text-zinc-300 sm:inline-block">Host Control Center</span></div><span className="text-[10px] uppercase tracking-widest text-zinc-400">Status: Online</span></header>
    <main className="mx-auto mt-8 max-w-6xl space-y-10 px-4 md:px-8"><ProfileHeader profile={profile} completionScore={completionScore} onOpenEditDrawer={() => setEditProfileOpen(true)} /><PropertyBranches businesses={businesses} /><ServiceCatalog foodMenu={foodMenu} roomTariffs={roomTariffs} onAddFood={() => setFoodOpen(true)} onAddRoom={() => setRoomOpen(true)} /><div className="flex items-center justify-between border-t border-white/10 pt-6"><Link className="text-xs uppercase tracking-widest text-zinc-400 hover:text-white" href="/">&lt;- Exit to Portal Root</Link><span className="text-xs text-zinc-600">Quad Computing Platform v1.0</span></div></main>
  </div>;
}

```

### app/(guest)/menu/page.tsx (298 lines)
```typescript
'use client';

import React, { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MenuHeader } from '@/components/guest/menu/MenuHeader';
import { DiningFilters } from '@/components/guest/menu/DiningFilters';
import { ServiceCallBar } from '@/components/guest/menu/ServiceCallBar';
import { DiningFeed } from '@/components/guest/menu/DiningFeed';
import { BeyondDiningSection } from '@/components/guest/menu/BeyondDiningSection';
import { ActiveBillView } from '@/components/guest/menu/ActiveBillView';
import { FloatingCartBar } from '@/components/guest/menu/FloatingCartBar';
import { UnifiedNavigationBar } from '@/components/guest/menu/UnifiedNavigationBar';
import { LiveOrderTracker } from '@/components/guest/menu/LiveOrderTracker';
import { VenueServicesMarquee } from '@/components/guest/menu/VenueServicesMarquee';
import { MenuModalsHost } from '@/components/guest/menu/MenuModalsHost';
import { useGuestMenuState } from '@/components/guest/menu/hooks/useGuestMenuState';

function GuestMenuContent() {
  const searchParams = useSearchParams();
  const rawTableParam = searchParams.get('table') || searchParams.get('table_number') || 'T-01';
  const tableMatch = rawTableParam.match(/[a-zA-Z0-9-]+/);
  const tableParam = tableMatch ? tableMatch[0] : 'T-01';

  const rawCafeParam =
    searchParams.get('cafe_id') || searchParams.get('venue') || searchParams.get('cafe') || '';
  const uuidMatch = rawCafeParam.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  );
  const cafeParam = uuidMatch
    ? uuidMatch[0]
    : rawCafeParam.trim()
    ? rawCafeParam.trim().split(/[\s,]+/)[0]
    : 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';

  const sectionParam = searchParams.get('section');
  const state = useGuestMenuState({ tableParam, cafeParam });

  useEffect(() => {
    if (sectionParam === 'portal' || sectionParam === 'services') {
      state.setActiveTab('menu');
      state.setShowBeyondDining(true);
      const timer = setTimeout(() => {
        document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [sectionParam]);

  if (state.isLoadingMenu) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-white border-t-transparent animate-spin rounded-full" />
      </div>
    );
  }

  if (state.menuError) {
    return (
      <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-neutral-950 px-6 text-center text-white">
        <h1 className="font-serif text-3xl font-light mb-2">Unavailable</h1>
        <p className="text-sm text-neutral-400 max-w-sm mb-6">{state.menuError}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl border border-neutral-800 bg-neutral-900 px-6 py-2.5 text-[10px] uppercase tracking-widest text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-[#faf9f6] text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white pb-36 sm:pb-40">
      {/* Apple-Level Luxury Toast Notification */}
      <AnimatePresence>
        {state.toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2.5 bg-neutral-950/95 text-white backdrop-blur-xl border border-neutral-800/90 px-5 py-3 rounded-full text-xs font-medium shadow-2xl tracking-wide max-w-[90vw]"
          >
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span>{state.toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <MenuHeader
        tableNo={state.tableNumber}
        guestName={state.currentGuestName}
        venueName={state.businessName}
        activeOrdersCount={state.sentItems.length}
        onOpenBill={() => state.setActiveTab('live_order')}
        billRequestedBanner={state.billRequestedBanner}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-2 pb-36 sm:pb-40">
        {state.activeTab === 'menu' ? (
          <div className="space-y-4 sm:space-y-5">
            <ServiceCallBar
              venueId={cafeParam || state.activeSession?.business_id || ''}
              tableNo={state.tableNumber}
              hasOrderPlaced={state.hasActiveOrder || state.sentItems.length > 0}
              onRequestBill={state.handleRequestBill}
              isRequestingBill={state.isRequestingBill}
              billRequested={state.billRequestedBanner}
            />

            {(state.hasActiveOrder || state.sentItems.length > 0 || (state.billSettled && state.settledTotal > 0)) && (
              <>
                <LiveOrderTracker
                  tableNumber={state.tableNumber}
                  kotStatus={state.kotStatus}
                  orderStatus={state.masterOrder?.status}
                  ticketNumber={state.ticketNumber}
                  items={state.sentItems}
                  runningTotal={state.runningTotal}
                  isAddon={state.isRecentAddon}
                  onViewBill={() => state.setActiveTab('live_order')}
                  onRequestBill={state.handleRequestBill}
                  isRequestingBill={state.isRequestingBill}
                  billRequested={state.billRequestedBanner}
                  billSettled={state.billSettled && state.settledTotal > 0}
                  settledTotal={state.settledTotal}
                  onExploreServices={() => {
                    state.setShowBeyondDining(true);
                    setTimeout(() => {
                      document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' });
                    }, 150);
                  }}
                  onRefresh={state.handleManualTrackerRefresh}
                  isRefreshing={state.isRefreshingTracker}
                />
                <VenueServicesMarquee
                  services={state.venueServices}
                  onSelectService={(service) => {
                    state.setShowBeyondDining(true);
                    state.showToast(`Selected: ${service.title}`);
                    setTimeout(() => {
                      document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' });
                    }, 150);
                  }}
                />
              </>
            )}

            <DiningFilters

// ... [TRUNCATED TIER-2: 148 lines omitted. Exported Signatures Below:]
export default function GuestMenuPage() {
```

### app/guest/lobby/page.tsx (281 lines)
```typescript
'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Building2, Wallet } from 'lucide-react';
import { useGuestLobbyStore, LobbyPresenceUser } from '@/lib/store/guest-lobby.store';
import { DynamicIslandNotification } from '@/components/guest/DynamicIslandNotification';
import { TableInteractionModal } from '@/components/guest/TableInteractionModal';
import { PrivateChatModal } from '@/components/guest/PrivateChatModal';
import { GlobalLobbyFeed } from '@/components/guest/lobby/GlobalLobbyFeed';
import { useGuestLobbyRealtime } from '@/components/guest/lobby/useGuestLobbyRealtime';
import { FullPortalModal } from '@/components/guest/lobby/FullPortalModal';
import HeroBanner from '@/components/guest/lobby/HeroBanner';
import { VenuePhotoVault } from '@/components/guest/lobby/VenuePhotoVault';
import { VenueLiveOffers } from '@/components/guest/lobby/VenueLiveOffers';
import { VenueReviewPortal } from '@/components/guest/lobby/VenueReviewPortal';
import { LobbyFloatingNavigation } from '@/components/guest/lobby/LobbyFloatingNavigation';
import { LobbyUsernameModal } from '@/components/guest/lobby/LobbyUsernameModal';
import { useGuestWallet } from '@/components/guest/lobby/useGuestWallet';
import { GuestWalletModal } from '@/components/guest/lobby/GuestWalletModal';
import { LobbyCashbackBanner } from '@/components/guest/lobby/LobbyCashbackBanner';

function GuestLobbyContent() {
  const searchParams = useSearchParams();
  const tableParam = searchParams.get('table') || 'T-01';

  const rawCafeParam =
    searchParams.get('cafe_id') || searchParams.get('venue') || searchParams.get('cafe') || '';
  const uuidMatch = rawCafeParam.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  );

  const { session, setSession } = useGuestLobbyStore();
  const cafeId = uuidMatch
    ? uuidMatch[0]
    : rawCafeParam.trim()
    ? rawCafeParam.trim().split(/[\s,]+/)[0]
    : session?.business_id || 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';

  const [selectedTargetUser, setSelectedTargetUser] = useState<LobbyPresenceUser | null>(null);
  const [showFullPortalModal, setShowFullPortalModal] = useState(false);
  const [portalBookSuccess, setPortalBookSuccess] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [guestHandle, setGuestHandle] = useState<string>('');

  const { wallet, transactions } = useGuestWallet(cafeId);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('guest_handle');
      if (stored) setGuestHandle(stored);
      if (!stored || !session?.guest_name || session.guest_name === 'Alex' || session.guest_name === 'You') {
        setShowOnboarding(true);
      }
    }
  }, [session]);

  const handleOnboardingComplete = (name: string, handle: string) => {
    setGuestHandle(handle);
    const newSession = {
      session_id: session?.session_id || `GS-${Date.now()}`,
      guest_name: name,
      table_number: session?.table_number || tableParam,
      business_id: cafeId,
      avatar: '☕',
      status: 'active' as const,
    };
    setSession(newSession);
    setShowOnboarding(false);
  };

  const currentSessionId = session?.session_id || 'gst-current';
  const currentUserName = guestHandle || session?.guest_name || 'Alex';
  const currentUserTable = session?.table_number || tableParam;

  const {
    onlineUsers,
    notifications,
    activeChat,
    setActiveChat,
    lobbyMessages,
    handleSendInvitation,
    handleAcceptNotification,
    handleDeclineNotification,
    handleSendChatMessage,
    handlePostLobbyMessage,
  } = useGuestLobbyRealtime({
    currentSessionId,
    currentUserName,
    currentUserTable,
  });

  return (
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-white/80 text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white pb-[calc(env(safe-area-inset-bottom,20px)+7rem)]">
      {/* Dynamic Island Notification Banner */}
      <DynamicIslandNotification
        notifications={notifications}
        onAccept={handleAcceptNotification}
        onDecline={handleDeclineNotification}
      />

      {/* Top Editorial Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-neutral-200 px-4 sm:px-6 md:px-10 py-3.5 sm:py-4 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Left Brand & Return */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Link
              href={`/menu?table=${encodeURIComponent(currentUserTable)}`}
              className="p-2 sm:p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 hover:border-neutral-300 transition-colors flex-shrink-0 cursor-pointer active:scale-95"
              aria-label="Back to Menu"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div className="min-w-0">
              <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-neutral-500 font-semibold block leading-none truncate">
                Live Guest Floor
              </span>
              <h1 className="font-serif text-lg sm:text-xl font-normal tracking-tight text-neutral-950 mt-1 leading-tight truncate">
                Social Lobby
              </h1>
            </div>
          </div>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 md:gap-3 flex-shrink-0">
            <Link
              href={`/menu?table=${encodeURIComponent(currentUserTable)}&section=portal#services-section${
                cafeId ? `&cafe_id=${encodeURIComponent(cafeId)}` : ''
              }`}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-medium text-neutral-700 bg-neutral-100/80 hover:bg-neutral-200/80 hover:text-neutral-950 border border-neutral-200 transition-colors cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <Building2 className="h-3.5 w-3.5 text-neutral-600" />
              <span className="hidden xs:inline sm:inline">Portal</span>
            </Link>

            {/* Live Wallet & 7% Cashback Pill */}
            <button
              type="button"
              onClick={() => setShowWalletModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all cursor-pointer active:scale-95 whitespace-nowrap shadow-xs"
              title="View Digital Wallet & 7% Cashback"
            >
              <Wallet className="h-3.5 w-3.5 text-emerald-600" />
              <span>₹{Number(wallet.balance || 0).toFixed(0)}</span>
              <span className="hidden xs:inline text-[9px] px-1 rounded-sm bg-emerald-600 text-white font-mono font-bold">
                7%
              </span>

// ... [TRUNCATED TIER-2: 131 lines omitted. Exported Signatures Below:]
export default function GuestLobbyPage() {
```

## 3. High-Impact Components Calling Supabase / Fetch / RPC

### components/host/workspaces/BillingWorkspace.tsx (238 lines)
```typescript
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';
import { InvoicePreviewModal } from './billing/InvoicePreviewModal';
import { TableManagementModal } from './billing/TableManagementModal';
import { TableQRCodeModal } from './billing/TableQRCodeModal';
import { POSCheckoutControls } from './billing/POSCheckoutControls';
import { POSTableSelector } from './billing/POSTableSelector';
import { POSDigitalReceipt } from './billing/POSDigitalReceipt';
import { POSOrderHistory } from './billing/POSOrderHistory';
import { usePOSCart } from './billing/hooks/usePOSCart';
import { usePOSTables } from './billing/hooks/usePOSTables';
import { useBillingSession } from './billing/hooks/useBillingSession';
import { BillingHeader } from './billing/components/BillingHeader';
import { BillRequestsModal } from './billing/BillRequestsModal';
import { usePOSCatalog } from './billing/hooks/usePOSCatalog';

export function BillingWorkspace({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { tables, businessId, fetchTables, markTableVacant, isOnline, activeStaff, setActiveStaff } =
    usePOSTables();
  usePOSCatalog(businessId);

  const serviceCatalog = useHostWorkspace((state) => state.serviceCatalog);
  const activeItems = useMemo(
    () => serviceCatalog.filter((i) => i.status !== 'archived'),
    [serviceCatalog]
  );

  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');
  const [showTableModal, setShowTableModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showBillRequests, setShowBillRequests] = useState(false);
  const [seenBillRequestIds, setSeenBillRequestIds] = useState<string[]>([]);

  // Modular POS & Table Hooks
  const cart = usePOSCart(activeItems);

  // Session & Settlement Hook
  const {
    orderHistory,
    isLoadingHistory,
    successMessage,
    invoicePreview,
    setInvoicePreview,
    billRequestedTables,
    handleMarkTableVacant,
    handleSelectActiveTable,
    handleGenerateBill,
    handleOrderSuccess,
    fetchOrderHistory,
  } = useBillingSession({
    cart,
    tables,
    activeStaff,
    markTableVacant,
    fetchTables,
    businessId,
  });

  const unreadBillRequestCount = billRequestedTables.filter((table) =>
    !seenBillRequestIds.includes(table.activeSession?.sessionId || table.id)
  ).length;
  const openBillRequests = () => {
    setSeenBillRequestIds((seen) => Array.from(new Set([
      ...seen,
      ...billRequestedTables.map((table) => table.activeSession?.sessionId || table.id),
    ])));
    setShowBillRequests(true);
  };

  // Auto-sync active table cart when guest places add-on orders or changes status
  const lastSyncHashRef = React.useRef('');

  useEffect(() => {
    if (!cart.selectedTableNumber || cart.selectedTableNumber === 'Takeaway / Counter') {
      lastSyncHashRef.current = '';
      return;
    }
    const currentTable = tables.find(
      (t) =>
        t.table_number === cart.selectedTableNumber ||
        (t.activeSession && t.activeSession.sessionId === cart.activeSessionId)
    );
    if (currentTable?.activeSession) {
      const sess = currentTable.activeSession;
      const syncHash = `${sess.sessionId || ''}_${sess.status || ''}_${sess.subtotal || ''}_${sess.itemsCount || ''}_${sess.updatedAt || ''}`;
      if (syncHash !== lastSyncHashRef.current) {
        lastSyncHashRef.current = syncHash;
        handleSelectActiveTable(currentTable);
      }
    }
  }, [tables, cart.selectedTableNumber, cart.activeSessionId, handleSelectActiveTable]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchOrderHistory();
    }
  }, [activeTab]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 relative">
      {/* Floating Apple-Style Monochrome Toast */}
      {successMessage && (
        <div className="fixed left-1/2 top-8 z-[100] flex -translate-x-1/2 items-center gap-3 rounded-full border border-neutral-800 bg-neutral-900/95 px-5 py-3 text-[13px] font-medium text-white shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 slide-in-from-top-10 duration-500 ease-out">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-black">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          </div>
          <span className="tracking-wide">{successMessage}</span>
        </div>
      )}

      {/* Masthead & Tab Switcher */}
      <BillingHeader
        activeStaff={activeStaff}
        onLockStaff={() => setActiveStaff(null)}
        isOnline={isOnline}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenQRModal={() => setShowQRModal(true)}
        onOpenBillRequests={openBillRequests}
        onOpenTableModal={() => setShowTableModal(true)}
        unreadBillRequestCount={unreadBillRequestCount}
      />

      {/* Main Content Areas */}
      {activeTab === 'pos' && (
        <div className="grid gap-6 lg:gap-8 lg:grid-cols-12 animate-in fade-in zoom-in-95 duration-300 items-start">
          <div className="space-y-6 lg:col-span-7">
            <POSCheckoutControls
              cafeId={businessId}
              activeItems={activeItems}
              cartItems={cart.selectedItems}
              onAddItemToCart={cart.handleAddItemToCart}
              onAddCustomItem={cart.handleAddCustomItem}
              addItem={cart.addItem}
              customAmount={cart.customAmount}
              setCustomAmount={cart.setCustomAmount}
              discountType={cart.discountType}
              setDiscountType={cart.setDiscountType}
              discountInputValue={cart.discountInputValue}
              setDiscountInputValue={cart.setDiscountInputValue}
              gstEnabled={cart.gstEnabled}
              setGstEnabled={cart.setGstEnabled}
              redemptionCode={cart.redemptionCode}
              setRedemptionCode={cart.setRedemptionCode}
              verifiedRedemption={cart.verifiedRedemption}
              setVerifiedRedemption={cart.setVerifiedRedemption}
            />
          </div>

// ... [TRUNCATED TIER-2: 88 lines omitted. Exported Signatures Below:]
export function BillingWorkspace({ onNavigate }: { onNavigate?: (tab: string) => void }) {
```

### components/host/workspaces/KitchenWorkspace.tsx (99 lines)
```typescript
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import type { KOTFilter } from './kitchen/types';
import { KitchenHeader } from './kitchen/KitchenHeader';
import { KitchenStatusFilterBar } from './kitchen/KitchenStatusFilterBar';
import { ChefTicketCard } from './kitchen/ChefTicketCard';
import { useKitchenAudio } from './kitchen/hooks/useKitchenAudio';
import { useKitchenTickets } from './kitchen/hooks/useKitchenTickets';
import { useKitchenStatusUpdate } from './kitchen/hooks/useKitchenStatusUpdate';

export type { KOTFilter };

export function KitchenWorkspace({ cafeId }: { cafeId?: string } = {}) {
  const [filter, setFilter] = useState<KOTFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [nowMs, setNowMs] = useState(Date.now());

  const { soundEnabled, setSoundEnabled, playChime } = useKitchenAudio();
  const { tickets, setTickets, isLoading, fetchTickets, toggleItemDone } = useKitchenTickets(playChime, cafeId);
  const { updateStatus } = useKitchenStatusUpdate(setTickets, fetchTickets, cafeId);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const totalCount = tickets.length;
  const pendingCount = tickets.filter((t) => t.status === 'PENDING').length;
  const preparingCount = tickets.filter((t) => t.status === 'PREPARING').length;
  const readyCount = tickets.filter((t) => t.status === 'READY').length;
  const deliveredCount = tickets.filter((t) => t.status === 'SERVED').length;

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (filter === 'PENDING' && t.status !== 'PENDING') return false;
      if (filter === 'PREPARING' && t.status !== 'PREPARING') return false;
      if (filter === 'READY' && t.status !== 'READY') return false;
      if (filter === 'DELIVERED' && t.status !== 'SERVED') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mNum = t.ticket_number?.toLowerCase().includes(q);
        const mDest = t.table_or_room?.toLowerCase().includes(q);
        const mItems = t.items?.some((it) => it.name?.toLowerCase().includes(q) || it.notes?.toLowerCase().includes(q));
        if (!mNum && !mDest && !mItems) return false;
      }
      return true;
    });
  }, [tickets, filter, searchQuery]);

  return (
    <div className="animate-in fade-in duration-300 pb-20 selection:bg-neutral-900 selection:text-white">
      <KitchenHeader soundEnabled={soundEnabled} onToggleSound={() => setSoundEnabled(!soundEnabled)} />
      <KitchenStatusFilterBar
        filter={filter} onFilterChange={setFilter} searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery} totalCount={totalCount} pendingCount={pendingCount}
        preparingCount={preparingCount} readyCount={readyCount} deliveredCount={deliveredCount}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-neutral-200 bg-neutral-100/60 h-80 animate-pulse" />
          ))}
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-neutral-300 rounded-3xl bg-neutral-50/50 space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-medium text-neutral-900">
              {filter === 'DELIVERED' ? 'No delivered orders in record' : 'Kitchen Pass is Clear'}
            </h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm">
              {filter === 'DELIVERED'
                ? 'Orders fulfilled and served will be archived here with exact delivery time audits.'
                : 'All orders have been prepared and delivered to guests.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch">
          {filteredTickets.map((ticket) => (
            <ChefTicketCard
              key={ticket.id}
              ticket={ticket}
              nowMs={nowMs}
              onStatusChange={(status) => updateStatus(ticket.id, status)}
              onToggleItemDone={(idx) => toggleItemDone(ticket.id, idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

```

### components/guest/menu/GuestIdentityModal.tsx (90 lines)
```typescript
'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, AtSign, User, Phone, Check } from 'lucide-react';
import { CURATED_AVATARS, sanitizeHandle, syncGuestWalletIdentity, type IdentityProfile } from './guest-identity.util';

interface Props {
  isOpen: boolean; onClose: () => void; initialName?: string; initialPhone?: string; initialHandle?: string;
  initialAvatar?: string; estimatedCashback?: number; cafeId?: string; tableNumber?: string;
  onSaveProfile: (profile: IdentityProfile) => void;
}

export const GuestIdentityModal: React.FC<Props> = ({
  isOpen, onClose, initialName = '', initialPhone = '', initialHandle = '',
  initialAvatar = '🎩', estimatedCashback = 0, cafeId, tableNumber, onSaveProfile,
}) => {
  const [name, setName] = useState(initialName), [phone, setPhone] = useState(initialPhone);
  const [handle, setHandle] = useState(() => initialHandle ? sanitizeHandle(initialHandle) : (initialName ? sanitizeHandle(initialName) : ''));
  const [avatar, setAvatar] = useState(initialAvatar || '🎩'), [err, setErr] = useState('');

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanName = name.trim(), cleanHandle = sanitizeHandle(handle), cleanPhone = phone.trim();
    if (!cleanName) return setErr('Please enter your display name');
    if (!cleanHandle || cleanHandle.length < 2) return setErr('Please choose a valid @handle');
    if (!cleanPhone || cleanPhone.length < 8) return setErr('Please enter a valid phone number');
    setErr('');
    const profile = { name: cleanName, handle: cleanHandle, phone: cleanPhone, avatar };
    await syncGuestWalletIdentity(cafeId, tableNumber, profile);
    onSaveProfile(profile);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <motion.div initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
            className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-3xl border-t sm:border border-zinc-200/80 p-6 shadow-2xl relative text-zinc-950 overflow-hidden"
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <h3 className="font-editorial text-2xl font-normal text-zinc-950">Guest Identity & Wallet</h3>
                <p className="text-xs text-zinc-400 font-light mt-0.5">Rolex / Executive Member Credentials</p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-black cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={submit} className="space-y-3 pt-3.5">
              <div className="flex flex-col items-center">
                <div className="relative w-14 h-14 rounded-2xl bg-[#faf8f5] border border-[#e8e2d5] flex items-center justify-center text-2xl shadow-inner mb-2 select-none">
                  {avatar}
                  <div className="absolute -bottom-1 -right-1 bg-zinc-950 text-white p-0.5 rounded-full shadow-xs"><Check className="w-2.5 h-2.5 stroke-[3]" /></div>
                </div>
                <div className="flex items-center gap-1.5 p-1 bg-zinc-100/70 border border-zinc-200/60 rounded-2xl">
                  {CURATED_AVATARS.map((a) => (
                    <button key={a.id} type="button" onClick={() => setAvatar(a.icon)} title={a.label}
                      className={`h-7 w-7 rounded-xl text-sm flex items-center justify-center transition-all ${avatar === a.icon ? 'bg-white text-zinc-950 shadow-xs ring-1 ring-zinc-300' : 'text-zinc-500 hover:text-zinc-900 opacity-60'}`}
                    >{a.icon}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input type="text" value={name} onChange={(e) => { setName(e.target.value); if (!handle) setHandle(sanitizeHandle(e.target.value)); }} placeholder="Display Name (e.g. Julian Sterling)" className="w-full text-sm font-sans pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:border-zinc-900 focus:outline-none transition-all" />
                </div>
                <div className="relative">
                  <AtSign className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input type="text" value={handle} onChange={(e) => setHandle(sanitizeHandle(e.target.value))} placeholder="@handle" className="w-full text-sm font-sans pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-950 placeholder:text-zinc-400 focus:bg-white focus:border-zinc-900 focus:outline-none transition-all" />
                </div>
                <div className="relative">
                  <Phone className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone Number (SMS & Cashback)" className="w-full text-sm font-sans pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:border-zinc-900 focus:outline-none transition-all" />
                </div>
              </div>
              <div className="rounded-2xl border border-[#ece7de] bg-[#faf8f5] p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-zinc-600 shrink-0" /><span className="text-[11px] text-zinc-700 font-medium">7% Cashback auto-linked to {handle || '@handle'}</span></div>
                {estimatedCashback > 0 && <span className="font-mono text-xs font-bold text-zinc-950 bg-white border border-[#e2ddd0] px-2.5 py-0.5 rounded-full shadow-2xs">+₹{estimatedCashback}</span>}
              </div>
              {err && <p className="text-xs text-rose-500 text-center font-medium">{err}</p>}
              <button type="submit" className="w-full py-3 rounded-2xl bg-zinc-950 text-white font-semibold text-xs uppercase tracking-[0.15em] hover:bg-zinc-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-zinc-950/10 cursor-pointer">
                <span>Activate VIP Profile & Wallet</span>
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

```

### components/guest/lobby/GuestWalletModal.tsx (82 lines)
```typescript
// components/guest/lobby/GuestWalletModal.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { GuestWallet, WalletTransaction } from './useGuestWallet';
import { WalletHeader } from './wallet/WalletHeader';
import { WalletBalanceCard } from './wallet/WalletBalanceCard';
import { WalletRedeemPass } from './wallet/WalletRedeemPass';
import { WalletTransactionList } from './wallet/WalletTransactionList';

interface GuestWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: GuestWallet;
  transactions: WalletTransaction[];
  currentUserTable: string;
  cafeId?: string;
  cafeName?: string;
}

export function GuestWalletModal({
  isOpen, onClose, wallet, transactions, currentUserTable, cafeId, cafeName,
}: GuestWalletModalProps) {
  if (!isOpen) return null;

  const resolvedCafeName = cafeName || wallet.cafe_name || 'Venue';
  const menuHref = `/menu?table=${encodeURIComponent(currentUserTable)}${
    cafeId ? `&cafe_id=${encodeURIComponent(cafeId)}` : ''
  }&redeem=wallet`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[260] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-neutral-950/95 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-[#F5E8D0]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <WalletHeader cafeName={resolvedCafeName} onClose={onClose} />
        <WalletBalanceCard wallet={wallet} cafeName={resolvedCafeName} tableNumber={currentUserTable} />
        <WalletRedeemPass
          balance={Number(wallet.balance || 0)}
          guestId={wallet.guest_id}
          guestHandle={wallet.guest_handle}
          tableNumber={currentUserTable}
          cafeId={cafeId || wallet.cafe_id}
        />
        <WalletTransactionList transactions={transactions} defaultCafeName={resolvedCafeName} />

        <div className="pt-4 border-t border-white/10 mt-3 relative z-10 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] text-neutral-300 font-medium truncate">
              Redeem towards Table {currentUserTable} order
            </p>
            <p className="text-[10px] text-neutral-500 truncate">
              Valid exclusively at {resolvedCafeName}
            </p>
          </div>
          <Link
            href={menuHref}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FAF1E4] via-[#F5E8D0] to-[#DFCA9F] text-neutral-950 hover:brightness-105 font-bold text-xs tracking-wide transition-all shadow-[0_0_15px_rgba(245,232,208,0.25)] whitespace-nowrap active:scale-95 shrink-0"
          >
            <span>Redeem at {resolvedCafeName}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default GuestWalletModal;

```

### components/host/wallet/ManualTopUpModal.tsx (75 lines)
```typescript
'use client';

import React from 'react';
import { X, Wallet, Sparkles } from 'lucide-react';
import { useManualTopupForm } from './hooks/useManualTopupForm';

interface ManualTopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  venueId: string;
  initialAmount?: number;
  onSuccess: () => void;
}

export function ManualTopUpModal({
  isOpen,
  onClose,
  venueId,
  initialAmount = 500,
  onSuccess,
}: ManualTopUpModalProps) {
  const { amount, setAmount, utrNumber, setUtrNumber, isSubmitting, errorMsg, handleSubmit } =
    useManualTopupForm({ venueId, initialAmount, onSuccess, onClose });

  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-white border border-neutral-200/90 shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-neutral-100 text-neutral-900"><Wallet className="w-4 h-4" /></div>
            <div>
              <h3 className="font-serif text-base font-medium text-neutral-900">Wallet Balance Top-Up</h3>
              <p className="text-[11px] text-neutral-500">Scan UPI & submit 12-digit transaction UTR</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-neutral-400 hover:text-neutral-900 transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        {errorMsg && <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200">{errorMsg}</div>}

        <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Merchant UPI ID</span>
            <p className="font-mono text-xs font-semibold text-neutral-900 mt-0.5">singhharshit1224@oksbi</p>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2 py-1 bg-white border border-neutral-200 rounded-lg text-neutral-700">Spendable Wallet</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Top-Up Amount (₹)</label>
            <input type="number" min="10" required value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full h-10 px-3.5 rounded-xl border border-neutral-200 bg-white font-mono text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 shadow-2xs" />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">UTR / UPI Reference (12 Digits) *</label>
            <input type="text" required placeholder="e.g. 427819034521" value={utrNumber} onChange={(e) => setUtrNumber(e.target.value)} className="w-full h-10 px-3.5 rounded-xl border border-neutral-200 bg-white font-mono text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 shadow-2xs placeholder:text-neutral-400" />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-all cursor-pointer">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{isSubmitting ? 'Submitting...' : 'Submit for Admin Review'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


```

