// Charge to room is for food and drinks only. A room, a tour, a rental or a spa session is paid at the desk like any
// other service, so it is neither offered on the room's menu nor accepted by the order route.

const DINE_TYPES = new Set(['food', 'beverage', 'drink']);

export function isRoomServiceDish(item: { item_type?: string | null; category?: string | null }): boolean {
  if (item.item_type) return DINE_TYPES.has(String(item.item_type).toLowerCase());
  return !/room|accommodation|service|spa|tour|rental/i.test(String(item.category || ''));
}

export const NOT_A_DISH_MESSAGE = 'Only food and drinks can be charged to the room. Please settle anything else at the desk.';

/** Throws (a 400) unless every requested item is a dish this venue serves. Checked against the catalogue, not the request. */
export async function assertDishesOnly(db: any, businessId: string, items: Array<{ item_id?: string; id?: string }>): Promise<void> {
  const ids = Array.from(new Set(items.map((i) => String(i.item_id || i.id || '')).filter(Boolean)));
  if (ids.length === 0) return;
  const { data, error } = await db.from('catalog_items').select('id, item_type, category').eq('business_id', businessId).in('id', ids);
  if (error) throw error;
  const rows = new Map<string, any>((data || []).map((r: any) => [String(r.id), r]));
  for (const id of ids) {
    const row = rows.get(id);
    if (!row || !isRoomServiceDish(row)) throw Object.assign(new Error(NOT_A_DISH_MESSAGE), { status: 400, code: 'NOT_A_DISH' });
  }
}
