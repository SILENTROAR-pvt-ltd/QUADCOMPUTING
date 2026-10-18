// The venue data Vibey works from, read through the guest menu's shared cache (one database read per venue per 15 s,
// served stale if the database blips). Rooms and venue services are not orderable by chat, so they are left out.
import { loadVenueMenu } from '@/lib/services/guest-menu/venue-menu-cache';
import { readMenuInfo } from '@/lib/services/menu-info/menu-info';
import type { MenuDish } from './retrieve';

const NOT_FOOD = new Set(['accommodation', 'service', 'room']);

export interface GuestVenue { business: any; dishes: MenuDish[]; featured: string[] }

export function toDishes(items: any[]): MenuDish[] {
  return (items || [])
    .filter((i) => i?.id && typeof i.name === 'string' && i.name.trim() && !NOT_FOOD.has(String(i.item_type || '').toLowerCase()))
    .map((i) => ({
      id: String(i.id),
      name: i.name.trim().slice(0, 120),
      price: Number(i.price) || 0,
      category: i.category ? String(i.category) : undefined,
      item_type: i.item_type ? String(i.item_type) : undefined,
      description: i.description ? String(i.description).slice(0, 400) : undefined,
    }));
}

/** Null when the venue does not exist. Throws only when the database fails and nothing is cached. */
export async function loadGuestVenue(db: any, businessId: string): Promise<GuestVenue | null> {
  const menu = await loadVenueMenu(db, businessId);
  if (!menu) return null;
  return { business: menu.business, dishes: toDishes(menu.items), featured: readMenuInfo(menu.business?.menu_info).featured };
}
