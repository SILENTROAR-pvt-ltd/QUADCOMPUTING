import { isValidUuid, buildTableOrFilter } from './session-utils';

export async function resolveTableAndBusiness(supabase: any, tableId?: string | null, tableNumber?: string | null, businessId?: string | null) {
  let targetBizId = isValidUuid(businessId) ? businessId : null;
  let resolvedTableId = isValidUuid(tableId) ? tableId : null;
  try {
    if (!targetBizId || !resolvedTableId) {
      const tableOr = tableNumber ? buildTableOrFilter(tableNumber) : '';
      let q = supabase.from('restaurant_tables').select('id, business_id, table_number');
      // A venue the route already validated stays the venue: its tables are the only ones considered, and it is never replaced.
      if (targetBizId) q = q.eq('business_id', targetBizId);
      if (tableOr) q = q.or(tableOr);
      const { data: t } = await q.limit(1).maybeSingle();
      if (t) {
        resolvedTableId = isValidUuid(t.id) ? t.id : resolvedTableId;
        if (!targetBizId) targetBizId = isValidUuid(t.business_id) ? t.business_id : null;
      }
    }
  } catch {}
  return { targetBizId, resolvedTableId };
}

export async function resolveOrInitMasterOrder(supabase: any, activeSession: any, targetBizId?: string | null, tableNumber?: string | null, resolvedTableId?: string | null) {
  let masterOrder: any = null;
  const closedIn = '("settled","SETTLED","completed","COMPLETED","cancelled","CANCELLED","billed","BILLED","closed","CLOSED","paid","PAID")';
  try {
    if (isValidUuid(activeSession?.id)) {
      const { data: o } = await supabase.from('orders').select('*').eq('session_id', activeSession.id)
        .not('status', 'in', closedIn).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (o && (Number(o.grand_total || o.subtotal || 0) > 0 || (Array.isArray(o.items) && o.items.length > 0))) masterOrder = o;
    }

    if (!masterOrder && targetBizId && tableNumber) {
      const tableOr = buildTableOrFilter(tableNumber);
      const { data: activeTableOrders } = await supabase.from('orders').select('*').eq('business_id', targetBizId)
        .or(tableOr).not('status', 'in', closedIn).order('created_at', { ascending: false }).limit(1);

      if (activeTableOrders && activeTableOrders.length > 0) {
        const candidate = activeTableOrders[0];
        if (Number(candidate.grand_total || candidate.subtotal || 0) > 0 || (Array.isArray(candidate.items) && candidate.items.length > 0)) {
          masterOrder = candidate;
          if (isValidUuid(activeSession?.id) && !masterOrder.session_id) {
            await supabase.from('orders').update({ session_id: activeSession.id }).eq('id', masterOrder.id);
          }
        }
      }
    }
  } catch {}
  return masterOrder;
}

