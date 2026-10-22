// The guest's order as an HTTP request: which endpoint, what body, and the key that makes a retry safe.
import type { CartItem } from '@/lib/store/cart.store';

export interface OrderRequestInput {
  roomCode?: string;
  tableNumber: string; cafeParam: string; guestId: string; activeSession: any; masterOrder: any;
  name: string; phone: string; notes: string; guestHandle?: string; currentGuestName: string;
  items: CartItem[];
}

/** The lines as the server reads them. Each dish carries only its own notes; the table note goes once, for the ticket. */
export function orderLines(items: CartItem[]) {
  return items.map((c) => ({
    id: c.item_id, item_id: c.item_id, name: c.name, price: c.total_item_price, quantity: c.quantity,
    notes: [(c.selected_addons || []).map((a) => `${a.name} (+₹${a.price})`).join(', '), c.notes].filter(Boolean).join(' | ') || undefined,
  }));
}

/** What identifies one attempt: the same cart sent again (a retry) gets the same key, a changed cart a new one. */
export const attemptSignature = (table: string, notes: string, items: CartItem[]) =>
  JSON.stringify([table, notes.trim(), orderLines(items).map((i) => [i.item_id, i.quantity, i.notes || ''])]);

export const newAttemptKey = () =>
  `go-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`;

/**
 * The request. `keepalive` lets it finish if the guest closes the page right after tapping, which matters now that the
 * order is shown as sent before the answer comes back.
 */
export function orderRequest(o: OrderRequestInput, key: string): { url: string; init: RequestInit } {
  const lines = orderLines(o.items);
  const tableNote = o.notes.trim() || undefined;
  const init = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true });
  // A room's order goes to the room's own endpoint: it checks the room session and the kitchen's hours, and puts the order on
  // the room's bill. Prices are always the menu's, never this payload's.
  if (o.roomCode) {
    return {
      url: `/api/guest/room/${encodeURIComponent(o.roomCode)}/order`,
      init: init({ items: lines.map((i) => ({ item_id: i.item_id, quantity: i.quantity, notes: i.notes })), note: tableNote || null, idempotency_key: key }),
    };
  }
  return {
    url: '/api/guest/order',
    init: init({
      session_id: o.activeSession?.id || o.guestId,
      order_id: o.masterOrder?.id || o.activeSession?.active_order_id || `ord_${Date.now()}`,
      table_number: o.tableNumber, business_id: o.activeSession?.business_id || o.cafeParam, cafe_id: o.cafeParam,
      guest_name: o.name.trim() || o.currentGuestName || 'Guest', guest_phone: o.phone.trim() || undefined, guest_handle: o.guestHandle,
      table_note: tableNote, items: lines, idempotency_key: key,
    }),
  };
}
