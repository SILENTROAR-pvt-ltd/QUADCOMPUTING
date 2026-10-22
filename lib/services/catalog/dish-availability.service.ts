// Puts a dish on the guest menu or takes it off, without deleting it. A dish that is off keeps its price, photo and
// recipe; the guest menu, the guest catalogue, the cashier's screen and the waiter's add-items list skip it, and an order
// that still carries it is refused (submit-order.service.ts). Rooms open and close from Accommodations, not here.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class DishAvailabilityError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const isRoom = (row: { item_type?: string | null; category?: string | null }) =>
  String(row.item_type || '').toLowerCase() === 'room' || String(row.category || '').toLowerCase() === 'accommodations';

/** Sets the dish's `is_available` at this venue only. Returns the stored value. */
export async function setDishAvailability(db: any, businessId: string, itemId: string, available: unknown) {
  if (!UUID.test(itemId)) throw new DishAvailabilityError('Invalid dish id', 400);
  if (typeof available !== 'boolean') throw new DishAvailabilityError('Say whether the dish is on or off', 400);

  const { data: row, error } = await db
    .from('catalog_items')
    .select('id, item_type, category, metadata')
    .eq('id', itemId)
    .eq('business_id', businessId)
    .maybeSingle();
  if (error) throw error;
  // A dish deleted while it was on past bills is kept as an archived row; it cannot come back from a switch.
  if (!row || row.metadata?.deleted) throw new DishAvailabilityError('Dish not found', 404);
  if (isRoom(row)) throw new DishAvailabilityError('Rooms open and close from Accommodations', 400);

  const { data: saved, error: saveError } = await db
    .from('catalog_items')
    .update({ is_available: available })
    .eq('id', itemId)
    .eq('business_id', businessId)
    .select('id, is_available')
    .maybeSingle();
  if (saveError) throw saveError;
  return { id: itemId, is_available: saved?.is_available ?? available };
}
