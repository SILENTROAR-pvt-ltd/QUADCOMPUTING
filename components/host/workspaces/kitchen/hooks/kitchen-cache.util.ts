import type { KitchenTicket } from '@/lib/utils/kitchen';

let inMemoryTickets: Record<string, KitchenTicket[]> = {};

export function getInitialCachedTickets(cafeId?: string): KitchenTicket[] {
  const key = cafeId || 'default';
  if (inMemoryTickets[key]?.length) return inMemoryTickets[key];

  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(`quad_kot_${key}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          inMemoryTickets[key] = parsed;
          return parsed;
        }
      }
    } catch {}
  }
  return [];
}

export function saveCachedTickets(cafeId: string | undefined, tickets: KitchenTicket[]) {
  const key = cafeId || 'default';
  inMemoryTickets[key] = tickets;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(`quad_kot_${key}`, JSON.stringify(tickets.slice(0, 50)));
    } catch {}
  }
}
