/** The fictional café's till and kitchen for the landing recordings: its catalogue, its floor and tonight's tickets. Made up. */
import type { CatalogItem } from '@/types';
import type { KitchenTicket } from '@/lib/utils/kitchen';
import type { RestaurantTable } from '@/components/host/workspaces/billing/hooks/usePOSTables';

const dish = (id: string, name: string, price: number, description: string, course: 'starter' | 'main' | 'dessert' | 'beverage', dietary: 'veg' | 'non_veg' = 'veg') => ({
  id, branchId: 'demo-branch', name, description, imageUrl: null, status: 'active', addons: [], category: 'F&B',
  createdAt: '2026-10-01T10:00:00.000Z', updatedAt: '2026-10-01T10:00:00.000Z',
  kind: 'food_beverage', course, dietary, price: { amountMinor: price, currency: 'INR' }, prepTimeMinutes: 12, allergens: [],
}) as unknown as CatalogItem;

export const posCatalog: CatalogItem[] = [
  dish('p1', 'Cappuccino', 180, 'Double shot', 'beverage'),
  dish('p2', 'Cold Brew', 220, '18-hour steep', 'beverage'),
  dish('p3', 'Masala Chai', 90, 'Ginger, cardamom', 'beverage'),
  dish('p4', 'Avocado Toast', 320, 'Sourdough, chilli flakes', 'starter'),
  dish('p5', 'Grilled Skewers', 360, 'Mint chutney', 'starter', 'non_veg'),
  dish('p6', 'Paneer Tikka', 340, 'Tandoor, pickled onion', 'starter'),
  dish('p7', 'Butter Chicken Rice', 420, 'Jeera rice', 'main', 'non_veg'),
  dish('p8', 'Margherita Pizza', 380, 'Wood-fired', 'main'),
  dish('p9', 'Pesto Pasta', 360, 'Basil, parmesan', 'main'),
  dish('p10', 'Seafood Paella', 540, 'For two', 'main', 'non_veg'),
  dish('p11', 'Big Breakfast Board', 460, 'Eggs, beans, sourdough', 'main', 'non_veg'),
  dish('p12', 'Tiramisu', 280, 'Mascarpone, espresso', 'dessert'),
];

const table = (n: number, zone: string, status: RestaurantTable['status'] = 'VACANT', session?: { total: number; items: number; bill?: boolean }): RestaurantTable => ({
  id: `pt${n}`, table_number: `T-${String(n).padStart(2, '0')}`, seating_capacity: n % 3 === 0 ? 6 : 4, status, is_active: true, zone,
  activeSession: session && {
    sessionId: `s${n}`, orderId: `o${n}`, status: session.bill ? 'bill_requested' : 'open', subtotal: session.total, grandTotal: session.total,
    itemsCount: session.items, updatedAt: '2026-10-15T14:00:00.000Z',
  },
});

export const posTables: RestaurantTable[] = [
  table(1, 'Ground floor'), table(2, 'Ground floor', 'OCCUPIED', { total: 1240, items: 5 }), table(3, 'Ground floor'),
  table(4, 'Ground floor'), table(5, 'Ground floor', 'RESERVED'), table(6, 'Ground floor', 'OCCUPIED', { total: 860, items: 3, bill: true }),
  table(7, 'Riverside'), table(8, 'Riverside', 'OCCUPIED', { total: 2180, items: 8 }), table(9, 'Riverside'),
];

/** Minutes before `now`, as an ISO time (the board shows each ticket's age). */
const ago = (now: number, min: number) => new Date(now - min * 60000).toISOString();

export function kitchenTickets(now: number): KitchenTicket[] {
  return [
    { id: 'k1', ticket_number: '142', table_or_room: 'T-04', status: 'PENDING', created_at: ago(now, 2), station: 'Kitchen',
      items: [{ name: 'Avocado Toast', qty: 1, notes: 'No chilli flakes' }, { name: 'Big Breakfast Board', qty: 2 }, { name: 'Tiramisu', qty: 1 }] },
    { id: 'k2', ticket_number: '141', table_or_room: 'T-08', status: 'PREPARING', created_at: ago(now, 9), updated_at: ago(now, 6), station: 'Grill',
      items: [{ name: 'Grilled Skewers', qty: 2, completed: true }, { name: 'Paneer Tikka', qty: 1 }],
      status_history: [{ from: 'PENDING', to: 'PREPARING', at: ago(now, 6) }] },
    { id: 'k3', ticket_number: '140', table_or_room: 'ROOM 204', status: 'READY', created_at: ago(now, 16), updated_at: ago(now, 3), station: 'Kitchen',
      items: [{ name: 'Butter Chicken Rice', qty: 1, completed: true }, { name: 'Masala Chai', qty: 2, completed: true }],
      status_history: [{ from: 'PENDING', to: 'PREPARING', at: ago(now, 14) }, { from: 'PREPARING', to: 'READY', at: ago(now, 3) }] },
  ];
}

/** The ticket that arrives mid-recording, the way a guest's order lands on the board. */
export const arrivingTicket = (now: number): KitchenTicket => ({
  id: 'k4', ticket_number: '143', table_or_room: 'T-02', status: 'PENDING', created_at: new Date(now).toISOString(), station: 'Bar',
  items: [{ name: 'Cold Brew', qty: 2 }, { name: 'Cappuccino', qty: 1, notes: 'Oat milk' }],
});
