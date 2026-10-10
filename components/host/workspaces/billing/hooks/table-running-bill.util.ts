import { normalizeTable, buildTableOrFilter } from '@/lib/services/session/session-entry.util';

export async function fetchTableRunningBill(supabase: any, businessId: string, tableId: string, tableNumber: string) {
  const rawT = (tableNumber || '').trim(), normT = normalizeTable(rawT);
  const tableOr = rawT ? buildTableOrFilter(rawT) : '';

  // 1. Find open session for this table
  let session = null;
  try {
    let sQ = supabase.from('dine_in_sessions').select('*')
      .in('status', ['open', 'bill_requested']).order('created_at', { ascending: false }).limit(1);
    if (businessId) sQ = sQ.eq('business_id', businessId);
    if (tableId && tableOr) sQ = sQ.or(`table_id.eq.${tableId},${tableOr}`);
    else if (tableId) sQ = sQ.eq('table_id', tableId);
    else if (tableOr) sQ = sQ.or(tableOr);
    const { data: sData } = await sQ.maybeSingle();
    if (sData) session = sData;
  } catch {}

  // 2. Query open active order for this table or session
  let activeOrder = null;
  const closedFilter = '("settled","SETTLED","completed","COMPLETED","cancelled","CANCELLED","billed","BILLED","closed","CLOSED","paid","PAID")';
  try {
    let oQ = supabase.from('orders').select('*')
      .not('status', 'in', closedFilter)
      .order('created_at', { ascending: false }).limit(1);
    if (businessId) oQ = oQ.eq('business_id', businessId);
    if (session?.id && (tableId || tableOr)) oQ = oQ.or(`session_id.eq.${session.id},${tableId ? `table_id.eq.${tableId},` : ''}${tableOr}`);
    else if (session?.id) oQ = oQ.eq('session_id', session.id);
    else if (tableId && tableOr) oQ = oQ.or(`table_id.eq.${tableId},${tableOr}`);
    else if (tableId) oQ = oQ.eq('table_id', tableId);
    else if (tableOr) oQ = oQ.or(tableOr);
    const { data: oData } = await oQ.maybeSingle();
    if (oData) activeOrder = oData;
  } catch {}

  // 3. Hydrate order items if order found
  let items: any[] = [];
  if (activeOrder?.id) {
    try {
      const { data: rawItems } = await supabase.from('order_items').select('*').eq('order_id', activeOrder.id).order('created_at', { ascending: true });
      items = rawItems && rawItems.length > 0 ? rawItems : Array.isArray(activeOrder.items) ? activeOrder.items : Array.isArray(activeOrder.raw_items) ? activeOrder.raw_items : [];
    } catch {
      items = Array.isArray(activeOrder.items) ? activeOrder.items : [];
    }
  }

  if (!activeOrder && items.length === 0) {
    return { session: null, activeOrder: null, items: [] };
  }
  return { session, activeOrder, items };
}
