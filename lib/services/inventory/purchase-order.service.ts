import type { NewOrder } from './purchase-input';
import { estimatedTotal, type PurchaseLine } from './purchase-message';
import { recordMovement } from './movement.service';

type Result<T> = { ok: true; value: T } | { ok: false; status: number; error: string };
const NEEDS_MIGRATION = 'Purchasing needs the latest database update (migration 20261010000008).';
const missingTable = (e: any) => e?.code === '42P01' || e?.code === 'PGRST205';

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
  const { data, error } = await supabase.from('purchase_orders').insert({
    business_id: businessId, reference: o.reference, vendor_id: o.vendor_id, vendor_name: o.vendor_name,
    vendor_phone: o.vendor_phone, lines: o.lines, estimated_total: estimatedTotal(o.lines), note: o.note, status: 'sent',
  }).select().single();
  if (missingTable(error)) return { ok: false, status: 503, error: NEEDS_MIGRATION };
  if (error?.code === '23505') return { ok: false, status: 409, error: 'This order was already saved.' };
  if (error) throw error;
  await supabase.from('raw_inventory_items').update({ supplier_name: o.vendor_name })
    .eq('business_id', businessId).in('id', o.lines.map((l) => l.item_id)).is('supplier_name', null);
  return { ok: true, value: data };
}

/**
 * Receives a delivery into stock. The order is claimed first (sent -> received), so a double tap
 * cannot add the goods twice; each line then becomes a purchase on the item's stock card.
 */
export async function receiveOrder(supabase: any, businessId: string, id: string, lines: PurchaseLine[]): Promise<Result<any>> {
  const { data: claimed, error } = await supabase.from('purchase_orders')
    .update({ status: 'received', received_at: new Date().toISOString() })
    .eq('id', id).eq('business_id', businessId).eq('status', 'sent').select().maybeSingle();
  if (error) throw error;
  if (!claimed) return { ok: false, status: 409, error: 'This order is no longer open (already received or cancelled).' };

  const received: any[] = [];
  const failed: string[] = [];
  for (const l of lines) {
    const r = await recordMovement(supabase, businessId, {
      item_id: l.item_id, type: 'PURCHASE', quantity: l.quantity, unit_cost: l.unit_cost,
      supplier: claimed.vendor_name, reference: claimed.reference, notes: 'Received against purchase order',
    });
    if (r.ok) received.push({ ...l, stock_after: r.value.stock_after });
    else failed.push(`${l.name}: ${r.error}`);
  }
  const ordered = Array.isArray(claimed.lines) ? claimed.lines : [];
  const merged = ordered.map((o: any) => ({ ...o, received_quantity: received.find((r) => r.item_id === o.item_id)?.quantity ?? 0 }));
  await supabase.from('purchase_orders').update({
    lines: merged, note: failed.length ? [claimed.note, `Not recorded: ${failed.join('; ')}`].filter(Boolean).join(' | ') : claimed.note,
  }).eq('id', id).eq('business_id', businessId);
  return { ok: true, value: { order: { ...claimed, lines: merged }, received: received.length, failed } };
}

export async function cancelOrder(supabase: any, businessId: string, id: string): Promise<Result<any>> {
  const { data, error } = await supabase.from('purchase_orders').update({ status: 'cancelled' })
    .eq('id', id).eq('business_id', businessId).eq('status', 'sent').select().maybeSingle();
  if (error) throw error;
  if (!data) return { ok: false, status: 409, error: 'Only an open order can be cancelled.' };
  return { ok: true, value: data };
}
