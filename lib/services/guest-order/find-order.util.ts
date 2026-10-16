import { CLOSED_STATUSES } from './order-utils';

export async function lookupExistingOrder(supabase: any, bizId: string, rawTable: string, normTable: string) {
  let existingActiveOrder: any = null, previousRawItems: any[] = [];
  // How many order_items rows the open bill had when it was read, so the database can tell if another order landed since.
  let previousItemRows: number | null = null;

  const { data: dbOrders, error } = await supabase.from('orders').select('*').eq('business_id', bizId)
    .or(`table_number.eq.${rawTable},table_number.eq.Table ${rawTable},table_number.eq.T-${normTable}`)
    .not('status', 'in', `(${CLOSED_STATUSES.map((s) => `"${s}"`).join(',')})`).order('created_at', { ascending: false }).limit(1);
  if (error) throw error;

  if (dbOrders && dbOrders.length > 0) {
    existingActiveOrder = dbOrders[0];
    const { data: ordItems, error: itemsErr } = await supabase.from('order_items').select('*').eq('order_id', existingActiveOrder.id);
    if (itemsErr) throw itemsErr;
    previousRawItems = ordItems && ordItems.length > 0 ? ordItems : Array.isArray(existingActiveOrder.items) ? existingActiveOrder.items : [];
    previousItemRows = Array.isArray(ordItems) ? ordItems.length : null;
  }

  return { existingActiveOrder, previousRawItems, previousItemRows };
}
