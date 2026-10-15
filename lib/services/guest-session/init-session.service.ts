import { isValidUuid, buildTableOrFilter } from './session-utils';
import { resolveTableAndBusiness, resolveOrInitMasterOrder } from './init-session-helpers.util';
import { upsertGuestRecord } from './guest-record.util';
import { ownVisitOrders } from '@/lib/services/guest-order/own-visit.util';
import { claimSessionGuest } from './session-guest.util';
export async function initializeGuestSession(bodyOrTable: any, clientOrBiz?: any) {
  const isDirect = typeof bodyOrTable === 'string';
  const supabase = (!isDirect && clientOrBiz) ? clientOrBiz : (await import('@/lib/supabase/client')).createClient();
  const rawBody = isDirect ? { table_id: bodyOrTable, business_id: clientOrBiz, guest_session_id: `GS-${Math.random().toString(36).substring(2, 9).toUpperCase()}` } : bodyOrTable;
  const { table_id, table_number, guest_session_id, business_id, guest_name, guest_handle, avatar } = rawBody;
  if (!table_number && !table_id) throw new Error('Missing table identifier or guest_session_id');
  const { targetBizId, resolvedTableId } = await resolveTableAndBusiness(supabase, table_id, table_number || 'Unknown', business_id);
  let activeSession: any = null;
  try {
    // A party that has asked for its bill is still at the table: a phone scanning now joins that same session instead
    // of opening a second one beside it (a stray session the next party would later have joined).
    let q = supabase.from('dine_in_sessions').select('*').in('status', ['open', 'bill_requested']).order('created_at', { ascending: false }).limit(1);
    q = resolvedTableId ? q.eq('table_id', resolvedTableId) : table_number ? q.eq('table_number', table_number) : q;
    if (targetBizId) q = q.eq('business_id', targetBizId);
    const { data: s } = await q.maybeSingle();
    if (s) {
      activeSession = s;
      // Only guest_handle: the deployed dine_in_sessions has no guest_name /
      // customer_phone columns, and naming them failed the whole write, so the
      // handle (the guest's wallet key for cashback) was never stored. Name and
      // phone live on the order (customer_name / customer_phone).
      // The table's session is shared by everyone at the table, so it never takes a guest's wallet handle. A handle
      // on the session credited cashback for the whole table to whichever account claimed it first (and showed the
      // wrong wallet on the host bill). Cashback is paused until it can be credited per dish.
    }
  } catch {}

  if (!activeSession && (targetBizId || resolvedTableId)) {
    try {
      const { data: td } = resolvedTableId ? await supabase.from('restaurant_tables').select('table_number').eq('id', resolvedTableId).maybeSingle() : { data: null };
      const tNum = table_number || td?.table_number || 'Unknown';
      const { data: n } = await supabase.from('dine_in_sessions').insert({
        business_id: targetBizId, table_id: resolvedTableId, table_number: tNum,
        guest_session_id: guest_session_id || `GS-${Date.now()}`, status: 'open',
        guest_handle: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).select().single();
      if (n) activeSession = n;
    } catch {}
  }

  if (!activeSession) {
    activeSession = { id: `sess-${Date.now()}`, business_id: targetBizId || 'demo-biz', table_id: resolvedTableId, table_number: table_number || 'Unknown', guest_session_id, guest_handle, status: 'open' };
  }
  if (isDirect) return activeSession;

  const masterOrder = await resolveOrInitMasterOrder(supabase, activeSession, targetBizId, table_number, resolvedTableId);
  let orderItems: any[] = [];
  try {
    if (masterOrder && isValidUuid(masterOrder.id)) {
      const { data: items } = await supabase.from('order_items').select('*').eq('order_id', masterOrder.id);
      orderItems = items?.length ? items : Array.isArray(masterOrder.items) ? masterOrder.items : [];
    } else if (masterOrder && Array.isArray(masterOrder.items)) orderItems = masterOrder.items;
  } catch {}

  const guestRecord = await upsertGuestRecord(supabase, activeSession?.id, guest_session_id, guest_name, avatar, resolvedTableId, table_number);
  let kotStatus = null, ticketNumber = null;
  try {
    if (masterOrder?.id) {
      const { findKitchenTicketForTableOrOrder } = await import('@/lib/store/active-order-store');
      const inMemKt = findKitchenTicketForTableOrOrder(targetBizId, table_number, masterOrder.id);
      if (inMemKt) { kotStatus = inMemKt.status; ticketNumber = inMemKt.ticket_number; }
    }
  } catch {}

  // A settled bill is only shown to a device that took part in it (it names the
  // order id); a new phone scanning the table gets a fresh table instead of the
  // previous party's bill.
  const knownOrderId = isValidUuid(rawBody?.known_order_id) ? rawBody.known_order_id : '';
  let isSettled = false, settledTotal = 0;
  if (!masterOrder && targetBizId && knownOrderId) {
    try {
      const { findRecentSettledOrder } = await import('@/lib/store/active-order-store');
      const inMemSettled = findRecentSettledOrder(targetBizId, table_number);

      const tableVariants = table_number ? buildTableOrFilter(table_number) : '';
      const orFilter = [resolvedTableId ? `table_id.eq.${resolvedTableId}` : '', tableVariants].filter(Boolean).join(',');
      let q = supabase.from('orders').select('id, grand_total, total_amount, subtotal, status, created_at, session_id')
        .eq('business_id', targetBizId).in('status', ['settled', 'SETTLED', 'completed', 'COMPLETED', 'paid', 'PAID'])
        .order('created_at', { ascending: false }).limit(10);
      if (orFilter) q = q.or(orFilter);
      const { data: settledOrders } = await q;

      // Only this device's own dine-in visit (see own-visit.util.ts). The
      // in-memory fallback is table-wide, so it counts only when it is our order.
      const visit = ownVisitOrders(settledOrders || [], knownOrderId);
      const memSettledAmount = inMemSettled?.id === knownOrderId
        ? Number(inMemSettled?.grand_total || inMemSettled?.total_amount || inMemSettled?.subtotal || 0)
        : 0;
      const finalSettled = Math.max(visit.total, memSettledAmount);
      if (finalSettled > 0 && (visit.own || memSettledAmount > 0)) {
        isSettled = true;
        settledTotal = finalSettled;
      }
    } catch {}
  }

  if (masterOrder || settledTotal <= 0) {
    isSettled = false;
    settledTotal = 0;
  }

  return {
    success: true,
    session: activeSession,
    guest: guestRecord,
    order: masterOrder,
    items: orderItems,
    kot_status: kotStatus,
    ticket_number: ticketNumber,
    is_settled: isSettled,
    settled_total: settledTotal,
  };
}
