import { recordMovement } from './movement.service';
import { parseNewItem, type NewItem } from './item-input';

export { parseNewItem, parseItemPatch, UNITS } from './item-input';

/** Adds stock items; opening quantities go through the ledger so value and history start right. */
export async function createItems(supabase: any, businessId: string, list: any[]) {
  const parsed = list.map(parseNewItem);
  const bad = parsed.find((p) => !p.ok);
  if (bad && !bad.ok) return { ok: false as const, status: 400, error: bad.error };
  const valid = parsed as NewItem[];

  // One card per ingredient: a second "Milk" would split its stock and recipes across two items.
  const { data: existing } = await supabase.from('raw_inventory_items').select('item_name').eq('business_id', businessId);
  const taken = new Set((existing || []).map((r: any) => String(r.item_name).trim().toLowerCase()));
  for (const p of valid) {
    const key = p.row.item_name.toLowerCase();
    if (taken.has(key)) {
      return { ok: false as const, status: 409, error: `${p.row.item_name} is already in stock. Record a purchase on it instead.` };
    }
    taken.add(key);
  }

  const { data, error } = await supabase.from('raw_inventory_items')
    .insert(valid.map((p) => ({ ...p.row, business_id: businessId }))).select();
  if (error) throw error;

  const warnings: string[] = [];
  for (const [i, item] of (data || []).entries()) {
    const { opening, cost } = valid[i];
    if (opening <= 0) continue;
    const r = await recordMovement(supabase, businessId, {
      item_id: item.id, type: 'OPENING', quantity: opening, unit_cost: cost, supplier: null, reference: null, notes: 'Opening stock',
    });
    if (r.ok) {
      Object.assign(item, { current_stock: r.value.stock_after, cost_per_unit: r.value.cost_per_unit });
    } else if (r.status === 503) {
      // Ledger function not installed yet: keep the opening quantity, logged the old way.
      await supabase.from('raw_inventory_items').update({ current_stock: opening }).eq('id', item.id).eq('business_id', businessId);
      await supabase.from('inventory_logs').insert({ business_id: businessId, item_id: item.id, change_amount: opening, action_type: 'OPENING', notes: 'Opening stock' });
      item.current_stock = opening;
    } else {
      warnings.push(`${item.item_name}: ${r.error}`);
    }
  }
  return { ok: true as const, items: data || [], warnings };
}
