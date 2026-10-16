'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { ActiveOrderItem } from '@/components/guest/menu/types';
import { useGuestRealtimeSync } from './useGuestRealtimeSync';
import { useGuestOrderPolling } from './useGuestOrderPolling';
import { useGuestOrderDispatch } from './useGuestOrderDispatch';
import { calculateRunningTotal, computeSettledTotal, checkHasActiveOrder } from './order-totals.util';
import { clearScopedGuestSession, rememberKnownOrder } from './guest-storage.util';

export function useGuestOrderActions(props: {
  tableNumber: string; cafeParam: string; guestId: string; activeSession: any; currentGuestName: string;
  cartItems: any[]; clearCart: () => void; showToast: (msg: string) => void; initialOrder?: any;
  initialItems?: ActiveOrderItem[]; initialBillRequested?: boolean; initialKotStatus?: string | null; initialTicketNumber?: string | null;
  initialBillSettled?: boolean; initialSettledTotal?: number; initialCashbackCredited?: number;
  businessId?: string;
}) {
  const [masterOrder, setMasterOrder] = useState<any>(props.initialOrder || null);
  const [sentItems, setSentItems] = useState<ActiveOrderItem[]>(props.initialItems || []);
  const [kotStatus, setKotStatus] = useState<string>(props.initialKotStatus || 'PENDING');
  const [ticketNumber, setTicketNumber] = useState<string | null>(props.initialTicketNumber || null);
  const [isRecentAddon, setIsRecentAddon] = useState(false), [isRefreshingTracker, setIsRefreshingTracker] = useState(false);
  const [billRequestedBanner, setBillRequestedBanner] = useState(Boolean(props.initialBillRequested));
  
  const hasInitActive = Boolean(props.initialOrder || (props.initialItems && props.initialItems.length > 0));
  const hasPosSettled = Boolean(!hasInitActive && props.initialBillSettled && (props.initialSettledTotal || 0) > 0);
  const [billSettled, setBillSettled] = useState(hasPosSettled);
  const [settledTotal, setSettledTotal] = useState(hasPosSettled ? (props.initialSettledTotal || 0) : 0);
  // Real cashback written to the wallet ledger for this bill, reported by
  // /api/guest/order. Never computed from the total — see ActiveBillView.
  const [cashbackCredited, setCashbackCredited] = useState(
    hasPosSettled ? (props.initialCashbackCredited || 0) : 0
  );

  const resetSettledState = useCallback(() => {
    setBillSettled(false); setSettledTotal(0); setCashbackCredited(0);
    try { import('@/lib/store/guest-lobby.store').then(({ useGuestLobbyStore }) => useGuestLobbyStore.getState().setSessionSettled(false)); } catch {}
  }, []);

  const markBillSettled = useCallback((amount?: number, cashback?: number) => {
    const total = computeSettledTotal(masterOrder, sentItems, amount);
    if (total <= 0) { resetSettledState(); return; }
    setSettledTotal(total); setCashbackCredited(Number(cashback || 0));
    setBillSettled(true); setBillRequestedBanner(false); setSentItems([]);
    setMasterOrder((o: any) => o ? { ...o, status: 'settled' } : o);
    clearScopedGuestSession(props.cafeParam, props.tableNumber);
    try {
      window.dispatchEvent(new CustomEvent('guest-wallet:refresh'));
      import('@/lib/store/guest-lobby.store').then(({ useGuestLobbyStore }) => useGuestLobbyStore.getState().setSessionSettled(true));
    } catch {}
  }, [masterOrder, sentItems, props.cafeParam, props.tableNumber, resetSettledState]);

  useEffect(() => {
    if (props.initialOrder) setMasterOrder(props.initialOrder);
    if (props.initialItems?.length) setSentItems(props.initialItems);
    if (props.initialBillRequested) setBillRequestedBanner(true);
    if (props.initialKotStatus) setKotStatus(props.initialKotStatus);
    if (props.initialTicketNumber) setTicketNumber(props.initialTicketNumber);
    if (props.initialBillSettled && (props.initialSettledTotal || 0) > 0 && !props.initialOrder && (!props.initialItems || props.initialItems.length === 0)) {
      setBillSettled(true);
      setSettledTotal(props.initialSettledTotal || 0);
      setCashbackCredited(props.initialCashbackCredited || 0);
    }
  }, [props.initialOrder, props.initialItems, props.initialBillRequested, props.initialKotStatus, props.initialTicketNumber, props.initialBillSettled, props.initialSettledTotal, props.initialCashbackCredited]);

  // Remember which order this device was part of (see rememberKnownOrder).
  useEffect(() => {
    if (masterOrder?.id) rememberKnownOrder(props.cafeParam, props.tableNumber, masterOrder.id);
  }, [masterOrder?.id, props.cafeParam, props.tableNumber]);

  const runningTotal = useMemo(() => calculateRunningTotal(sentItems), [sentItems]);
  const hasActiveOrder = useMemo(() => checkHasActiveOrder(sentItems, masterOrder), [sentItems, masterOrder]);

  useEffect(() => {
    if (hasActiveOrder || sentItems.length > 0) resetSettledState();
  }, [hasActiveOrder, sentItems.length, resetSettledState]);

  // The table's push ping reads the order at once; the polling hook below is declared after, so it is reached through a ref.
  const readOrderRef = useRef<() => void>(() => {});
  const pushUp = useGuestRealtimeSync({
    businessId: props.businessId || props.activeSession?.business_id || props.cafeParam, tableNumber: props.tableNumber, masterOrderId: masterOrder?.id,
    markBillSettled, resetSettledState, setKotStatus, setTicketNumber, onTableChanged: () => readOrderRef.current(),
  });

  const { pollActiveOrder } = useGuestOrderPolling({
    tableNumber: props.tableNumber, cafeParam: props.cafeParam, guestId: props.guestId, activeSessionId: props.activeSession?.id, pushUp,
    hasActiveOrder, sentItemsCount: sentItems.length, billRequestedBanner, markBillSettled, setSentItems, setMasterOrder, setKotStatus, setTicketNumber, setBillRequestedBanner,
  });

  readOrderRef.current = () => { void pollActiveOrder(); };

  const dispatch = useGuestOrderDispatch({
    tableNumber: props.tableNumber, cafeParam: props.cafeParam, guestId: props.guestId, activeSession: props.activeSession,
    currentGuestName: props.currentGuestName, cartItems: props.cartItems, masterOrder, clearCart: props.clearCart,
    showToast: props.showToast, setSentItems, setMasterOrder, setKotStatus, setTicketNumber, setIsRecentAddon, setBillRequestedBanner, resetSettledState,
  });

  return {
    masterOrder, sentItems, runningTotal, hasActiveOrder, kotStatus, ticketNumber, isRecentAddon, isRefreshingTracker,
    handleManualTrackerRefresh: async () => { setIsRefreshingTracker(true); await pollActiveOrder(); setTimeout(() => setIsRefreshingTracker(false), 500); },
    billRequestedBanner, billSettled, settledTotal, cashbackCredited, ...dispatch,
  };
}
