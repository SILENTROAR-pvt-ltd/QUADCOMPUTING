'use client';

import { useState, useEffect, useMemo } from 'react';
import { useGuestLobbyStore } from '@/lib/store/guest-lobby.store';
import type { MenuItem } from '@/components/guest/menu/types';
import { getScopedGuestUuid, getStoredGuestProfile } from './guest-storage.util';
import { partitionMenuItems } from './menu-category.util';
import { fetchMenuAndInitSession } from './guest-menu-fetch.util';

export function useGuestMenuSession({ tableParam, cafeParam, roomParam = '' }: { tableParam: string; cafeParam: string; roomParam?: string }) {
  const { session, setSession, setSessionSettled } = useGuestLobbyStore();
  const [guestId, setGuestId] = useState('');
  const [activeSession, setActiveSession] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [businessName, setBusinessName] = useState(() => session?.business_name || '');
  const [businessId, setBusinessId] = useState('');
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
  const [initialCashbackCredited, setInitialCashbackCredited] = useState(0);

  useEffect(() => {
    setActiveSession(null); setInitialOrder(null); setInitialItems([]);
    setInitialBillRequested(false); setInitialKotStatus(null); setInitialTicketNumber(null);
    setIsLoadingMenu(true); setMenuError(null);

    const localId = getScopedGuestUuid(cafeParam, tableParam);
    const { customerId, guestName } = getStoredGuestProfile();
    setGuestId(localId);

    fetchMenuAndInitSession({
      tableParam, cafeParam, localId, customerId, guestName, avatar: session?.avatar || '☕', skipSession: Boolean(roomParam),
      onMenuReady: (readyData) => {
        setMenuItems(readyData.items); setTableNumber(readyData.tableNumber);
        if (readyData.businessName) setBusinessName(readyData.businessName);
        if (readyData.businessId) setBusinessId(readyData.businessId);
        setIsLoadingMenu(false);
      },
    }).then((res) => {
      setMenuItems(res.items); setTableNumber(res.tableNumber);
      if (res.businessName) setBusinessName(res.businessName);
      if (res.businessId) setBusinessId(res.businessId);
      setActiveSession(res.session); setInitialOrder(res.order); setInitialItems(res.orderItems);
      setInitialBillRequested(res.isBillRequested); setInitialKotStatus(res.kotStatus); setInitialTicketNumber(res.ticketNumber);

      const hasActive = Boolean(res.order || (res.orderItems && res.orderItems.length > 0));

      if (hasActive) {
        setInitialBillSettled(false); setInitialSettledTotal(0); setInitialCashbackCredited(0); setSessionSettled(false);
      } else if (res.isSettled && res.settledTotal > 0) {
        setInitialBillSettled(true); setInitialSettledTotal(res.settledTotal);
        setInitialCashbackCredited(res.cashbackCredited || 0);
        setSessionSettled(true);
      } else {
        setInitialBillSettled(false); setInitialSettledTotal(0); setInitialCashbackCredited(0); setSessionSettled(false);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- loads the menu when the table or venue changes; businessName and the session are set by this effect and would refetch the menu in a loop
  }, [tableParam, cafeParam]);

  const { diningItems, venueServices, culinaryCategories } = useMemo(() => partitionMenuItems(menuItems), [menuItems]);

  return {
    guestId, businessId, activeSession, tableNumber, businessName, isLoadingMenu, menuError,
    diningItems, venueServices, culinaryCategories, initialOrder, initialItems,
    initialBillRequested, initialKotStatus, initialTicketNumber, initialBillSettled, initialSettledTotal,
    initialCashbackCredited,
  };
}
