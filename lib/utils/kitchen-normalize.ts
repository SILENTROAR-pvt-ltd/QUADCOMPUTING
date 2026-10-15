import type { KitchenTicket } from '@/lib/utils/kitchen';

/** A list from the database that may arrive as null, a JSON string, or a list. Anything else is an empty list. */
function asList(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Makes a ticket from the API or realtime safe to draw: the dishes and the status history are always lists, and a ticket
 * with no id or a broken row never reaches the screen. One malformed ticket must not blank the whole kitchen board.
 */
export function normalizeKitchenTicket<T extends Partial<KitchenTicket>>(ticket: T): T & { items: any[]; status_history: any[] } {
  return { ...ticket, items: asList(ticket.items).filter((i) => i && typeof i === 'object'), status_history: asList(ticket.status_history) } as T & { items: any[]; status_history: any[] };
}

export function normalizeKitchenTickets(list: unknown): KitchenTicket[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((t) => t && typeof t === 'object' && typeof (t as any).id === 'string')
    .map((t) => normalizeKitchenTicket(t as KitchenTicket)) as KitchenTicket[];
}
