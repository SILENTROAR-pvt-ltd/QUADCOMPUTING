'use client';

import { useState, useRef } from 'react';
import { walletAuthHeaders } from '@/lib/utils/wallet-secret';
import { useCartStore, type CartItem } from '@/lib/store/cart.store';
import { attemptSignature, newAttemptKey, orderRequest } from './guest-order-request';

export function useGuestOrderDispatch(p: {
  roomCode?: string;
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
  // One key per cart attempt. A retry after a dropped connection re-sends the same key, so the server returns the order
  // it already created instead of making a second one. Any change to the cart makes a new key; success clears it.
  const attemptRef = useRef<{ sig: string; key: string } | null>(null);

  /**
   * Places the order and shows it as sent at once: the cart empties and the thank-you card opens on the tap, while the
   * request travels. The server's answer then fills in the bill and the ticket. If the server refuses or cannot be
   * reached, the dishes go back into the cart and `onFailed` reopens the review with the reason, so nothing is lost.
   */
  const handlePlaceOrder = async (name: string, phone: string, notes: string, cb: (addon: boolean) => void, handle?: string, onFailed?: () => void) => {
    if (p.cartItems.length === 0 || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSendingToKitchen(true);
    p.resetSettledState?.();
    const sent: CartItem[] = [...p.cartItems];
    const store = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} };
    if (name.trim()) { store('quad_guest_name', name.trim()); store('guest_name', name.trim()); }
    if (phone.trim()) store('quad_guest_phone', phone.trim());
    const typed = handle?.trim() ? (handle.trim().startsWith('@') ? handle.trim() : `@${handle.trim()}`) : '';
    if (typed) { store('guest_handle', typed); store('quad_guest_wallet_id', typed); }
    let stored: string | undefined;
    try { stored = localStorage.getItem('guest_handle') || localStorage.getItem('quad_guest_wallet_id') || undefined; } catch {}
    const guestHandle = typed || stored;
    if (guestHandle && p.cafeParam) {
      fetch(`/api/guest/wallet?guest_id=${encodeURIComponent(guestHandle)}&cafe_id=${encodeURIComponent(p.cafeParam)}`, { headers: walletAuthHeaders() }).catch(() => {});
    }

    const sig = attemptSignature(p.tableNumber, notes, sent);
    if (attemptRef.current?.sig !== sig) attemptRef.current = { sig, key: newAttemptKey() };
    const { url, init } = orderRequest({ ...p, name, phone, notes, guestHandle, items: sent }, attemptRef.current.key);

    // Shown as sent now; the answer below confirms it.
    const guessAddon = Boolean(p.masterOrder?.id);
    p.clearCart();
    p.setKotStatus('PENDING');
    cb(guessAddon);

    const fail = (message: string) => {
      useCartStore.getState().restoreItems(sent);
      onFailed?.();
      p.showToast(message);
    };
    try {
      const res = await fetch(url, init);
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        attemptRef.current = null;
        p.resetSettledState?.();
        try {
          const { useGuestLobbyStore } = await import('@/lib/store/guest-lobby.store');
          useGuestLobbyStore.getState().setSessionSettled(false);
        } catch {}
        p.setSentItems(data.items || []);
        if (data.order) p.setMasterOrder(data.order);
        if (data.kot_status) p.setKotStatus(data.kot_status);
        if (data.ticket?.ticket_number || data.ticket_number) p.setTicketNumber(data.ticket?.ticket_number || data.ticket_number);
        p.setIsRecentAddon(Boolean(data.is_addon));
      } else {
        fail(`${data.error || 'The order did not go through.'} Your dishes are back in the cart.`);
      }
    } catch {
      fail('No connection, so the order did not go through. Your dishes are back in the cart; try again.');
    } finally {
      setIsSendingToKitchen(false);
      setTimeout(() => { isSubmittingRef.current = false; }, 600);
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
