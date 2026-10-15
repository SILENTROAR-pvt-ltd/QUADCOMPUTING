import { MARKET_VENDOR, type NewOrder } from './purchase-input';
import { estimatedTotal, type PurchaseLine } from './purchase-message';
import { recordMovement } from './movement.service';
import { parseNewItem } from './item-input';

type Result<T> = { ok: true; value: T } | { ok: false; status: number; error: string };
const NEEDS_MIGRATION = 'Purchasing needs the latest database update (migration 20261010000008).';
const missingTable = (e: any) => e?.code === '42P01' || e?.code === 'PGRST205';
const key = (name: string) => String(name).trim().toLowerCase();

export async function listPurchasing(supabase: any, businessId: string) {
  const [vendors, orders] = await Promise.all([
    supabase.from('inventory_vendors').select('id, name, phone, notes').eq('business_id', businessId).order('name'),
    supabase.from('purchase_orders').select('*').eq('business_id', businessId).order('sent_at', { ascending: false }).limit(60),
  ]);
  if (missingTable(vendors.error) || missingTable(orders.error)) return { ok: false as const, status: 503, error: NEEDS_MIGRATION };
  if (vendors.error) throw vendors.error;
  if (orders.error) throw orders.error;
  return { ok: true as const, value: { vendors: vendors.data || [], orders: orders.data || [] } };
}

/** Saves the order that was just sent, and makes its vendor the preferred supplier of items that have none. */
export async function createOrder(supabase: any, businessId: string, o: NewOrder): Promise<Result<any>> {
  // A new item that is already in stock under that name would split its stock across two cards: say so now.
  const fresh = o.lines.filter((l) => l.is_new);
  if (fresh.length) {
    const { data: existing } = await supabase.from('raw_inventory_items').select('item_name').eq('business_id', businessId);
    const taken = new Set((existing || []).map((r: any) => key(r.item_name)));
    const clash = fresh.find((l) => taken.has(key(l.name)));
    if (clash) return { ok: false, status: 409, error: `${clash.name} is already in your raw inventory. Pick it from the list instead of adding it as new.` };
  }

  const { data, error } = await supabase.from('purchase_orders').insert({
    business_id: businessId, reference: o.reference, vendor_id: o.vendor_id, vendor_name: o.vendor_name,
    vendor_phone: o.vendor_phone, lines: o.lines, estimated_total: estimatedTotal(o.lines), note: o.note, status: 'sent',
  }).select().single();
  if (missingTable(error)) return { ok: false, status: 503, error: NEEDS_MIGRATION };
  if (error?.code === '23505') return { ok: false, status: 409, error: 'This order was already saved.' };
  if (error) throw error;
  const known = o.lines.filter((l) => !l.is_new).map((l) => l.item_id);
  if (known.length && o.vendor_name !== MARKET_VENDOR) {
    await supabase.from('raw_inventory_items').update({ supplier_name: o.vendor_name })
      .eq('business_id', businessId).in('id', known).is('supplier_name', null);
  }
  return { ok: true, value: data };
}

/**
 * Makes the stock items for the new lines of a delivery, and says which real item each line is. A retry finds the item
 * it made the first time (same id), and a name already in stock is reused, so one ingredient never becomes two cards.
 */
async function ensureNewItems(supabase: any, businessId: string, lines: any[], supplier: string): Promise<{ ids: Map<string, string>; failed: Map<string, string> }> {
  const ids = new Map<string, string>();
  const failed = new Map<string, string>();
  const fresh = lines.filter((l) => l.is_new);
  if (!fresh.length) return { ids, failed };

  const { data: existing } = await supabase.from('raw_inventory_items').select('id, item_name').eq('business_id', businessId);
  const byId = new Set((existing || []).map((r: any) => r.id));
  const byName = new Map((existing || []).map((r: any) => [key(r.item_name), r.id]));

  const toMake: any[] = [];
  for (const l of fresh) {
    if (byId.has(l.item_id)) { ids.set(l.item_id, l.item_id); continue; }
    const same = byName.get(key(l.name));
    if (same) { ids.set(l.item_id, same as string); continue; }
    const parsed = parseNewItem({ itemName: l.name, unit: l.unit, category: l.category, costPerUnit: l.unit_cost });
    if (!parsed.ok) { failed.set(l.item_id, parsed.error); continue; }
    toMake.push({ ...parsed.row, id: l.item_id, business_id: businessId, supplier_name: supplier === MARKET_VENDOR ? null : supplier });
    byName.set(key(l.name), l.item_id);
  }
  if (toMake.length) {
    const { error } = await supabase.from('raw_inventory_items').insert(toMake);
    if (error) {
      console.error('[purchasing] could not create the new stock items', error);
      for (const row of toMake) failed.set(row.id, 'The new item could not be created.');
    } else {
      for (const row of toMake) ids.set(row.id, row.id);
    }
  }
  return { ids, failed };
}

/**
 * Receives a delivery into stock. The order is claimed first (sent -> received), so a double tap
 * cannot add the goods twice. Items the host typed in as new are created now, then each line becomes a purchase
 * on its item's stock card; the lines are booked together, not one after another.
 */
export async function receiveOrder(supabase: any, businessId: string, id: string, lines: PurchaseLine[]): Promise<Result<any>> {
  const { data: claimed, error } = await supabase.from('purchase_orders')
    .update({ status: 'received', received_at: new Date().toISOString() })
    .eq('id', id).eq('business_id', businessId).eq('status', 'sent').select().maybeSingle();
  if (error) throw error;
  if (!claimed) return { ok: false, status: 409, error: 'This order is no longer open (already received or cancelled).' };

  const ordered: any[] = Array.isArray(claimed.lines) ? claimed.lines : [];
  // What is new comes from the stored order, never from the request.
  const stored = new Map(ordered.map((o) => [o.item_id, o]));
  const arriving = lines.map((l) => {
    const o = stored.get(l.item_id);
    return o?.is_new ? { ...l, is_new: true, name: o.name, unit: o.unit, category: o.category } : l;
  });
  const { ids, failed: notMade } = await ensureNewItems(supabase, businessId, arriving, claimed.vendor_name);

  const outcomes = await Promise.all(arriving.map(async (l) => {
    if (notMade.has(l.item_id)) return { l, error: notMade.get(l.item_id)! };
    const r = await recordMovement(supabase, businessId, {
      item_id: ids.get(l.item_id) ?? l.item_id, type: 'PURCHASE', quantity: l.quantity, unit_cost: l.unit_cost,
      supplier: claimed.vendor_name, reference: claimed.reference, notes: 'Received against purchase order',
    });
    return r.ok ? { l, stock_after: r.value.stock_after } : { l, error: r.error };
  }));

  const received: any[] = [];
  const failed: string[] = [];
  for (const o of outcomes) {
    if ('error' in o) failed.push(`${o.l.name}: ${o.error}`);
    else received.push({ ...o.l, stock_after: o.stock_after });
  }
  const merged = ordered.map((o: any) => ({ ...o, received_quantity: received.find((r) => r.item_id === o.item_id)?.quantity ?? 0 }));
  await supabase.from('purchase_orders').update({
    lines: merged, note: failed.length ? [claimed.note, `Not recorded: ${failed.join('; ')}`].filter(Boolean).join(' | ') : claimed.note,
  }).eq('id', id).eq('business_id', businessId);
  return { ok: true, value: { order: { ...claimed, lines: merged }, received: received.length, failed } };
}

/** A purchase already in hand: it is recorded as an order and received in the same step, so it shows in the order history. */
export async function recordPurchaseNow(supabase: any, businessId: string, o: NewOrder): Promise<Result<any>> {
  const created = await createOrder(supabase, businessId, o);
  if (!created.ok) return created;
  return receiveOrder(supabase, businessId, created.value.id, o.lines);
}

export async function cancelOrder(supabase: any, businessId: string, id: string): Promise<Result<any>> {
  const { data, error } = await supabase.from('purchase_orders').update({ status: 'cancelled' })
    .eq('id', id).eq('business_id', businessId).eq('status', 'sent').select().maybeSingle();
  if (error) throw error;
  if (!data) return { ok: false, status: 409, error: 'Only an open order can be cancelled.' };
  return { ok: true, value: data };
}
