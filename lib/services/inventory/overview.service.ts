import type { SupabaseClient } from '@supabase/supabase-js';
import { buildOverview } from './overview.util';
import type { InventoryOverview, StockMovement } from './inventory.types';

const ITEM_COLUMNS = 'id, item_name, category, unit, current_stock, threshold, cost_per_unit, supplier_name, is_critical, updated_at';
// Catalogue entries that are not cooked from stock (rooms and stay services).
const NOT_DISHES = ['room', 'accommodation', 'service', 'addon'];

async function itemsWithFallback(supabase: SupabaseClient, businessId: string) {
  const res = await supabase.from('raw_inventory_items').select(ITEM_COLUMNS).eq('business_id', businessId).order('item_name');
  // Before migration 20261010000007 there is no supplier column; show stock without it.
  if (res.error?.code === '42703') {
    return supabase.from('raw_inventory_items').select(ITEM_COLUMNS.replace(', supplier_name', '')).eq('business_id', businessId).order('item_name');
  }
  return res;
}

/** Stock items with use, cover and value, and the venue's inventory totals. */
export async function getInventoryOverview(supabase: SupabaseClient, businessId: string): Promise<InventoryOverview> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [items, logs, recipes, dishes] = await Promise.all([
    itemsWithFallback(supabase, businessId),
    supabase.from('inventory_logs').select('item_id, action_type, change_amount, total_cost, supplier_name, logged_at')
      .eq('business_id', businessId).gte('logged_at', since).limit(20000),
    supabase.from('recipe_ingredients').select('raw_item_id, catalog_item_id').eq('business_id', businessId),
    supabase.from('catalog_items').select('id, item_type').eq('business_id', businessId),
  ]);
  if (items.error) throw items.error;
  const dishCount = (dishes.data || []).filter((d: any) => !NOT_DISHES.includes(String(d.item_type || '').toLowerCase())).length;
  return buildOverview({ items: items.data || [], logs: logs.data || [], recipes: recipes.data || [], dishCount });
}

/** The stock ledger, newest first, optionally for one item or one movement type. */
export async function listMovements(
  supabase: SupabaseClient, businessId: string, opts: { itemId?: string | null; type?: string | null; limit?: number },
): Promise<StockMovement[]> {
  let q = supabase.from('inventory_logs')
    .select('id, item_id, action_type, change_amount, total_cost, stock_after, supplier_name, reference, notes, logged_at, item:raw_inventory_items(item_name, unit)')
    .eq('business_id', businessId).order('logged_at', { ascending: false }).limit(Math.min(opts.limit || 200, 500));
  if (opts.itemId) q = q.eq('item_id', opts.itemId);
  if (opts.type) q = q.eq('action_type', opts.type.toUpperCase());
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map((r: any) => {
    const item = Array.isArray(r.item) ? r.item[0] : r.item;
    return {
      id: r.id, item_id: r.item_id, item_name: item?.item_name || 'Removed item', unit: item?.unit || '',
      action_type: String(r.action_type || '').toUpperCase(), change_amount: Number(r.change_amount) || 0,
      total_cost: Number(r.total_cost) || 0, stock_after: r.stock_after ?? null, supplier_name: r.supplier_name ?? null,
      reference: r.reference ?? null, notes: r.notes ?? null, logged_at: r.logged_at,
    };
  });
}
