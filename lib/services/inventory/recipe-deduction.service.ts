// lib/services/inventory/recipe-deduction.service.ts

/**
 * Deducts recipe-driven raw-ingredient stock for a settled order via the
 * atomic `deduct_recipe_inventory_for_order` RPC (row-locked, single transaction).
 *
 * There is intentionally no non-atomic fallback: a per-ingredient read-then-write
 * loop without row locking is a stock-count race condition under concurrent
 * settlements, which is worse than surfacing a clear failure for ops to retry.
 */
export async function deductInventoryForOrder(supabase: any, orderId: string, businessId: string) {
  if (!orderId || !businessId) return { success: false, reason: 'Missing orderId or businessId' };
  if (!supabase || typeof supabase.rpc !== 'function') {
    return { success: false, reason: 'No Supabase client available for inventory RPC' };
  }

  const { data, error } = await supabase.rpc('deduct_recipe_inventory_for_order', {
    p_order_id: orderId,
  });

  if (error) {
    return { success: false, reason: error.message || String(error) };
  }
  if (!data?.success) {
    return { success: false, reason: data?.error || 'Inventory deduction RPC returned failure', ...data };
  }
  return { success: true, ...data };
}
