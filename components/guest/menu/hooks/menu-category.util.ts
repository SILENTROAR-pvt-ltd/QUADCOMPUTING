import type { MenuItem } from '@/components/guest/menu/types';
import { sortCulinaryCategories } from '@/lib/utils/menu-categories';

export { sortCulinaryCategories };

export function isVenueServiceItem(item: MenuItem): boolean {
  const t = (item.type || item.item_type || '').toLowerCase();
  const c = (item.category || '').toLowerCase();
  const n = (item.name || '').toLowerCase();

  if (t === 'food' || t === 'drink' || t === 'beverage') return false;
  if (t === 'accommodation' || t === 'room' || t === 'service') return true;

  const hospitalityKws = ['accommodation', 'room', 'suite', 'cabana', 'stay', 'spa', 'wellness', 'rental', 'tour', 'concierge'];
  if (hospitalityKws.some(kw => c.includes(kw))) {
    const foodKws = ['starter', 'main', 'dessert', 'beverage', 'food', 'drink'];
    return !foodKws.some(kw => c.includes(kw));
  }

  return n.includes('cabana') || n.includes('work pod') || n.includes('day-use') || n.includes('spa') || n.includes('massage');
}

export function culinaryTabs(rawCategories: Set<string>): string[] {
  return ['Dining', ...sortCulinaryCategories(rawCategories)];
}

export function partitionMenuItems(menuItems: MenuItem[]) {
  const diningItems = menuItems.filter((i) => !isVenueServiceItem(i));
  const venueServices = menuItems.filter((i) => isVenueServiceItem(i));

  const rawCategories = new Set<string>();
  diningItems.forEach((i) => {
    if (i.category && i.category.trim()) rawCategories.add(i.category.trim());
  });

  return {
    diningItems,
    venueServices,
    culinaryCategories: culinaryTabs(rawCategories),
  };
}
