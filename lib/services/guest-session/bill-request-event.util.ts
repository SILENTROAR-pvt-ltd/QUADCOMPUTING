import { isValidUuid } from './session-utils';

export async function processBillRequestEvent(
  supabase: any,
  updatedSession: any,
  sessionId: string,
  resolvedBizId: string,
  rawTable: string,
  normTable: string,
  nowIso: string
) {
  let runningTotal = 0, itemCount = 0;

  try {
    const { findActiveOrder, saveActiveOrder, recordBillRequestEvent } = await import('@/lib/store/active-order-store');
    const inMem = findActiveOrder(resolvedBizId, rawTable || normTable);
    if (inMem) {
      (inMem as any).bill_requested = true;
      inMem.updated_at = nowIso;
      saveActiveOrder(inMem);
      runningTotal = Number(inMem.grand_total || inMem.subtotal || 0);
      itemCount = Array.isArray(inMem.items) ? inMem.items.length : 0;
    }

    recordBillRequestEvent({
      id: `br_${Date.now()}`, session_id: updatedSession?.id || sessionId || null,
      business_id: resolvedBizId, table_number: rawTable || normTable || '01',
      requested_at: nowIso, item_count: itemCount, running_total: runningTotal, session_status: 'bill_requested',
    });
  } catch {}

  try {
    const openOrderQuery = () => supabase.from('orders').select('id, items, subtotal, grand_total, total_amount')
      .not('status', 'in', '("settled","SETTLED","completed","COMPLETED","cancelled","CANCELLED","billed")')
      .order('created_at', { ascending: false }).limit(1);

    // By session first; guest orders are not always linked to the dine-in
    // session id, so fall back to this venue's open order on the same table
    // (otherwise the bill request was recorded as ₹0 / 0 items).
    let order: any = null;
    if (isValidUuid(updatedSession?.id)) {
      ({ data: order } = await openOrderQuery().eq('session_id', updatedSession.id).maybeSingle());
    }
    if (!order && rawTable) {
      ({ data: order } = await openOrderQuery().eq('business_id', resolvedBizId)
        .or(`table_number.eq.${rawTable},table_number.eq.Table ${rawTable},table_number.eq.T-${normTable}`).maybeSingle());
    }
    if (order) {
      runningTotal = Number(order.grand_total || order.total_amount || order.subtotal || runningTotal);
      // Line items live in order_items; orders.items is a legacy column and usually empty.
      const { count } = await supabase.from('order_items').select('id', { count: 'exact', head: true }).eq('order_id', order.id);
      if (count) itemCount = count;
      else if (Array.isArray(order.items) && order.items.length > 0) itemCount = order.items.length;
    }

    if (isValidUuid(updatedSession?.id)) {
      await supabase.from('bill_request_events').insert({
        business_id: updatedSession.business_id || resolvedBizId, session_id: updatedSession.id,
        table_id: updatedSession.table_id || null, guest_session_id: updatedSession.guest_session_id || null,
        table_number: rawTable || updatedSession.table_number, requested_at: nowIso, item_count: itemCount, running_total: runningTotal,
      });
    }
  } catch (error) {
    console.error('[Bill Request History]', error);
  }
}
