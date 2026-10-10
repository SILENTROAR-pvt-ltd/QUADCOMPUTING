'use client';

import { useState, useRef } from 'react';
import { walletAuthHeaders } from '@/lib/utils/wallet-secret';

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
        fetch(`/api/guest/wallet?guest_id=${encodeURIComponent(guestHandle)}&cafe_id=${encodeURIComponent(p.cafeParam)}`, { headers: walletAuthHeaders() }).catch(() => {});
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
