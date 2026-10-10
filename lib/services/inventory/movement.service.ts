import type { MovementInput } from './movement-input';

export type MovementResult =
  | { ok: true; value: { item_id: string; change: number; stock_after: number; cost_per_unit: number } }
  | { ok: false; status: number; error: string };

/** Records one stock movement through the row-locked ledger function. */
export async function recordMovement(supabase: any, businessId: string, m: MovementInput): Promise<MovementResult> {
  const { data, error } = await supabase.rpc('record_inventory_movement', {
    p_business_id: businessId,
    p_item_id: m.item_id,
    p_type: m.type,
    p_quantity: m.quantity,
    p_unit_cost: m.unit_cost,
    p_supplier: m.supplier,
    p_reference: m.reference,
    p_notes: m.notes,
  });
  if (!error) return { ok: true, value: data };

  const msg = String(error.message || '');
  if (msg.includes('ITEM_NOT_FOUND')) return { ok: false, status: 404, error: 'That stock item no longer exists.' };
  if (msg.includes('INVALID_')) return { ok: false, status: 400, error: 'That movement is not valid.' };
  if (error.code === 'PGRST202' || msg.includes('record_inventory_movement')) {
    return { ok: false, status: 503, error: 'Stock movements need the latest database update (migration 20261010000007).' };
  }
  console.error('[inventory] movement failed', error);
  return { ok: false, status: 500, error: 'The stock could not be updated. Please try again.' };
}

/**
 * Deducts the recipe ingredients of a sold order, once per order (the database marks the order).
 * Uses the service role: a dish sold on one terminal must reduce stock whoever is logged in.
 */
export async function deductOrderInventory(db: any, orderId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await db.rpc('deduct_recipe_inventory_for_order', { p_order_id: orderId });
    if (error) return { ok: false, error: error.message };
    return { ok: Boolean(data?.success), error: data?.error };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'deduction failed' };
  }
}
