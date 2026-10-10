// Which kitchen station a ticket belongs to. Unchanged rules, moved out of the board component.
import type { KitchenTicket } from '@/lib/utils/kitchen';

export type KitchenStation = 'Kitchen' | 'Bar' | 'Grill';
export const STATIONS: KitchenStation[] = ['Kitchen', 'Bar', 'Grill'];

const BAR_WORDS = ['beer', 'cocktail', 'mocktail', 'coffee'];
const GRILL_WORDS = ['grill', 'steak', 'burger', 'kebab'];

export function resolveStation(ticket: KitchenTicket): KitchenStation {
  if (ticket.station) {
    const s = ticket.station.trim().toLowerCase();
    if (s.includes('bar') || s.includes('drink')) return 'Bar';
    if (s.includes('grill') || s.includes('bbq') || s.includes('tandoor')) return 'Grill';
    return 'Kitchen';
  }

  // No station on the ticket: derive it from the item categories and names.
  for (const item of Array.isArray(ticket.items) ? ticket.items : []) {
    const cat = (item.category || '').toLowerCase();
    const name = (item.name || '').toLowerCase();
    if (cat.includes('bar') || cat.includes('drink') || cat.includes('beverage') || BAR_WORDS.some((w) => name.includes(w))) {
      return 'Bar';
    }
    if (cat.includes('grill') || cat.includes('bbq') || cat.includes('tandoor') || GRILL_WORDS.some((w) => name.includes(w))) {
      return 'Grill';
    }
  }
  return 'Kitchen';
}
