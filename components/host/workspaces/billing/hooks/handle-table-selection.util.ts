import { fetchTableRunningBill } from './table-running-bill.util';

export interface TableLines { session: any; activeOrder: any; items: any[] }
const EMPTY: TableLines = { session: null, activeOrder: null, items: [] };

/**
 * The version of a table's live bill, from the polled table list. It changes whenever an order is added or the
 * bill changes, so a bill loaded under the same key is still current and can be shown at once.
 */
export function tableLinesKey(table: any): string | null {
  const s = table?.activeSession;
  if (!s?.orderId) return null;
  return [s.orderId, s.updatedAt, s.itemsCount, s.subtotal, s.status].join('|');
}

/** Loads a table's live bill (session, order and dishes) without touching the cart. */
export async function fetchTableLines(table: any, supabase: any, businessId: string): Promise<TableLines> {
  if ((table.status || '').toUpperCase() === 'VACANT' && !table.activeSession) return EMPTY;

  const tableId = table.id, tableNumber = table.table_number || table.name;
  let session = table.activeSession || null, activeOrder: any = null, items: any[] = [];

  try {
    const res = await fetch('/api/host/sessions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: table.activeSession?.sessionId || table.activeSession?.id || null, table_id: tableId, table_number: tableNumber, order_id: table.activeSession?.orderId || table.active_order_id || null }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.session) session = data.session;
      if (data.order) activeOrder = data.order;
      if (Array.isArray(data.items) && data.items.length > 0) items = data.items;
      else if (Array.isArray(data.aggregated) && data.aggregated.length > 0) items = data.aggregated;
    }
  } catch {}

  if (!items || items.length === 0) {
    try {
      const fb = await fetchTableRunningBill(supabase, businessId, tableId, tableNumber);
      if (fb.session) session = fb.session;
      if (fb.activeOrder) activeOrder = fb.activeOrder;
      if (fb.items?.length) items = fb.items;
    } catch {}
  }

  return { session, activeOrder, items };
}

/** Puts a loaded bill into the POS cart. A closed or empty bill clears the cart instead. */
export function applyTableLines(
  lines: TableLines, table: any, setCartItems: Function, setLinkedOrderId: Function, setActiveSessionId: Function
): TableLines {
  const reset = () => { setCartItems([]); setLinkedOrderId(null); setActiveSessionId(null); return EMPTY; };
  const { session, activeOrder, items } = lines;

  const isClosedSession = session && !['open', 'bill_requested'].includes(String(session.status || '').toLowerCase());
  const isClosedOrder = activeOrder && ['settled', 'completed', 'paid', 'closed', 'cancelled', 'billed'].includes(String(activeOrder.status || '').toLowerCase());
  if (isClosedSession || isClosedOrder || (!activeOrder && (!items || items.length === 0))) return reset();

  const orderId = activeOrder?.id || table.active_order_id || null;
  const sessionId = session?.id || session?.sessionId || table.activeSession?.sessionId || activeOrder?.session_id || null;
  setLinkedOrderId(orderId);
  setActiveSessionId(sessionId);

  if (items && items.length > 0) {
    setCartItems(items.map((it: any) => ({
      id: it.id || it.menu_item_id || `it-${Date.now()}`, name: it.name || it.item_name || 'Item',
      price: Number(it.price || it.unit_price) || 0,
      quantity: Number(it.quantity || it.qty) || 1, qty: Number(it.quantity || it.qty) || 1,
      variant: it.variant || it.selected_variant,
    })));
  } else {
    setCartItems([]);
  }
  return lines;
}

export async function handleTableSelection(
  table: any, setCartItems: Function, setLinkedOrderId: Function,
  setActiveSessionId: Function, supabase: any, businessId: string
) {
  return applyTableLines(await fetchTableLines(table, supabase, businessId), table, setCartItems, setLinkedOrderId, setActiveSessionId);
}
