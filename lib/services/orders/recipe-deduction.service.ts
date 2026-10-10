import { adminDb } from '@/lib/supabase/admin';
import { deductOrderInventory } from '@/lib/services/inventory/movement.service';

const SOLD = new Set(['settled', 'served', 'completed']);

/**
 * Deducts recipe stock for a till order once it is sold. All order types share one database
 * function that marks the order, so saving the same bill again (or settling a QR order whose
 * kitchen ticket already deducted) never takes the stock twice.
 */
export async function deductRecipeInventoryForOrder(
  _supabase: any,
  businessId: string,
  orderId: string,
  _items: any[],
  status: string = 'SETTLED',
): Promise<void> {
  if (!orderId || !SOLD.has(String(status || '').toLowerCase())) return;
  const result = await deductOrderInventory(adminDb(), orderId);
  if (!result.ok) console.error('[RecipeDeduction] stock was not deducted', { businessId, orderId, error: result.error });
}
