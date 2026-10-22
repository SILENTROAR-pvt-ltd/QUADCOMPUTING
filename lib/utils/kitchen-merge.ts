// A screen hears about a ticket from several places at once: its own tap (shown before the server answers), the push that
// names the new stage, and reads of the whole list. They can arrive out of order, and a read can come from just before the
// change. A ticket's stage only ever moves forward (update_kot_status: PENDING -> PREPARING -> READY -> SERVED, or
// CANCELLED), so an older answer must never move it back: a ticket the chef marked ready stays ready.
import type { KitchenTicket } from './kitchen';

const RANK: Record<string, number> = { PENDING: 0, PREPARING: 1, READY: 2, SERVED: 3, CANCELLED: 4 };
const rank = (status?: string) => RANK[String(status || '').toUpperCase()] ?? -1;

/** The incoming ticket, except that its stage (and when stages happened) never goes behind the one already shown. */
export function mergeTicket(shown: KitchenTicket | undefined, incoming: KitchenTicket): KitchenTicket {
  if (!shown || rank(incoming.status) >= rank(shown.status)) return incoming;
  return { ...incoming, status: shown.status, status_history: shown.status_history, updated_at: shown.updated_at };
}

/** A fresh list from the server, merged ticket by ticket with what is shown. The server's list decides which tickets exist. */
export function mergeTickets(shown: KitchenTicket[], incoming: KitchenTicket[]): KitchenTicket[] {
  const byId = new Map(shown.map((t) => [t.id, t]));
  return incoming.map((t) => mergeTicket(byId.get(t.id), t));
}
