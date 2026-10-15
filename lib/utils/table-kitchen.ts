import type { KitchenItem, KitchenTicket } from './kitchen';
import { normalizeTableNumber } from './live-table-state';

/** Where one dish is, in words the waiter acts on. */
export type DishState = 'waiting' | 'cooking' | 'ready' | 'served';

/** "T-01", "Table 1", "1" and "01" are the same table. */
const tableKey = (raw: string | null | undefined) => normalizeTableNumber(raw).replace(/^0+(?=\d)/, '');

/**
 * The kitchen tickets that belong on one table's panel: everything still being worked on or waiting to be taken out, and
 * the served ones that belong to the bill now open (so a previous party's tickets never show up).
 */
export function ticketsForTable(tickets: KitchenTicket[], tableNumber: string, orderId?: string | null): KitchenTicket[] {
  const key = tableKey(tableNumber);
  if (!key) return [];
  return tickets
    .filter((t) => t.status !== 'CANCELLED' && tableKey(t.table_or_room) === key)
    .filter((t) => t.status !== 'SERVED' || (Boolean(orderId) && t.order_id === orderId))
    .sort((a, b) => Date.parse(a.created_at || '') - Date.parse(b.created_at || ''));
}

/** One dish's state: a dish the chef ticked off counts as ready even while the rest of its ticket is still cooking. */
export function dishState(ticket: Pick<KitchenTicket, 'status'>, item: Pick<KitchenItem, 'completed'>): DishState {
  if (ticket.status === 'SERVED') return 'served';
  if (ticket.status === 'READY' || item.completed) return 'ready';
  if (ticket.status === 'PREPARING') return 'cooking';
  return 'waiting';
}

export interface KitchenSummary {
  waiting: number;
  cooking: number;
  ready: number;
  served: number;
  /** Dishes the waiter can take out now. */
  readyDishes: number;
  /** Tickets still open (not served yet): what the Kitchen tab counts. */
  openTickets: number;
}

/** Dish counts by state across a table's tickets, for the tab badge and the "ready to serve" banner. */
export function kitchenSummary(tickets: KitchenTicket[]): KitchenSummary {
  const out: KitchenSummary = { waiting: 0, cooking: 0, ready: 0, served: 0, readyDishes: 0, openTickets: 0 };
  for (const t of tickets) {
    if (t.status !== 'SERVED') out.openTickets += 1;
    for (const item of t.items || []) {
      const qty = Math.max(1, Number(item?.qty) || 1);
      out[dishState(t, item)] += qty;
    }
  }
  out.readyDishes = out.ready;
  return out;
}
