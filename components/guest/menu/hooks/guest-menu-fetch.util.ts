import { getKnownOrder } from './guest-storage.util';

export interface FetchMenuParams {
  tableParam: string;
  cafeParam: string;
  localId: string;
  customerId: string | null;
  guestName: string;
  avatar: string;
  onMenuReady?: (data: { items: any[]; tableNumber: string; businessName: string; businessId?: string; tableId?: string }) => void;
}

export async function fetchMenuAndInitSession(p: FetchMenuParams) {
  const q = new URLSearchParams({ table: p.tableParam });
  if (p.cafeParam) q.set('cafe_id', p.cafeParam);

  // Parallel fetch: menu and guest session concurrently
  const menuPromise = fetch(`/api/guest/menu?${q.toString()}`)
    .then((r) => r.json())
    .then((menuData) => {
      if (!menuData?.success) throw new Error(menuData?.error || 'Venue unavailable');
      if (p.onMenuReady) {
        p.onMenuReady({
          items: menuData.items || [],
          tableNumber: menuData.table?.table_number || p.tableParam,
          businessName: menuData.business?.name || '',
          businessId: menuData.business?.id,
          tableId: menuData.table?.id,
        });
      }
      return menuData;
    });

  const sessPromise = fetch('/api/guest/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table_number: p.tableParam,
      guest_session_id: p.localId,
      customer_id: p.customerId,
      business_id: p.cafeParam || '',
      guest_name: p.guestName,
      avatar: p.avatar,
      known_order_id: getKnownOrder(p.cafeParam, p.tableParam) || undefined,
    }),
  })
    .then((r) => r.json())
    .catch(() => ({}));

  const [menuData, sessData] = await Promise.all([menuPromise, sessPromise]);

  return {
    items: menuData.items || [],
    tableNumber: menuData.table?.table_number || p.tableParam,
    businessId: menuData.business?.id || null,
    businessName: menuData.business?.name || '',
    tableId: menuData.table?.id,
    session: sessData?.session || null,
    order: sessData?.order || null,
    orderItems: sessData?.items || [],
    isBillRequested: sessData?.session?.status === 'bill_requested',
    kotStatus: sessData?.kot_status || null,
    ticketNumber: sessData?.ticket_number || null,
    isSettled: Boolean(sessData?.is_settled),
    settledTotal: Number(sessData?.settled_total || 0),
    // Real credited amount from the wallet ledger — see get-order.service.ts
    cashbackCredited: Number(sessData?.cashback_credited || 0),
  };
}
