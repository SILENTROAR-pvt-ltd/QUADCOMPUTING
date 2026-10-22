import { isValidUuid, normalizeTable } from './session-utils';
import { processBillRequestEvent } from './bill-request-event.util';
import { ringBillRequest } from '../guest/bill-call';
import { buildTableOrFilter, CLOSED_STATUSES } from '../guest-order/order-utils';

export async function updateGuestSession(body: any, supabase: any) {
  const { session_id, table_number, business_id, cafe_id, action, status } = body;
  // Unauthenticated guests may only ask for the bill. Any other status (e.g. 'closed') is a staff action.
  if (!(action === 'request_bill' || status === 'bill_requested')) throw new Error('Invalid status: guests may only request the bill');
  const targetStatus = 'bill_requested';
  const rawTable = (table_number || '').trim();
  const normTable = normalizeTable(rawTable);
  const nowIso = new Date().toISOString();
  const resolvedBizId = isValidUuid(business_id) ? business_id : isValidUuid(cafe_id) ? cafe_id : '';
  if (!resolvedBizId) throw new Error('Missing or invalid business_id');

  let updatedSession: any = null;
  let lastDbError: any = null;
  const tableOr = rawTable ? buildTableOrFilter(rawTable) : '';
  const LIVE = ['open', 'bill_requested'];

  // Only a live session of this very table is ever marked. A phone still holding the last party's session id cannot
  // reopen that closed session, and cannot mark another table's.
  if (isValidUuid(session_id) && tableOr) {
    try {
      const { data: updated, error } = await supabase.from('dine_in_sessions').update({ status: targetStatus, updated_at: nowIso })
        .eq('id', session_id).eq('business_id', resolvedBizId).or(tableOr).in('status', LIVE).select().maybeSingle();
      if (error) lastDbError = error;
      if (updated) updatedSession = updated;
    } catch (e) { lastDbError = e; }
  }

  // Otherwise the table's newest live session, and only that one.
  if (!updatedSession && tableOr) {
    try {
      const { data: latest, error: findErr } = await supabase.from('dine_in_sessions').select('id')
        .eq('business_id', resolvedBizId).or(tableOr).in('status', LIVE)
        .order('updated_at', { ascending: false }).limit(1).maybeSingle();
      if (findErr) lastDbError = findErr;
      if (latest?.id) {
        const { data: updated, error } = await supabase.from('dine_in_sessions').update({ status: targetStatus, updated_at: nowIso })
          .eq('id', latest.id).eq('business_id', resolvedBizId).select().maybeSingle();
        if (error) lastDbError = error;
        if (updated) updatedSession = updated;
      }
    } catch (e) { lastDbError = e; }
  }

  // No live session: a new one is opened only when the table really has an open order to bill.
  if (!updatedSession && tableOr && !lastDbError) {
    const { data: openOrders, error: orderErr } = await supabase.from('orders').select('id').eq('business_id', resolvedBizId)
      .or(tableOr).not('status', 'in', `(${CLOSED_STATUSES.map((s) => `"${s}"`).join(',')})`).limit(1);
    if (orderErr) throw orderErr;
    if (!openOrders || openOrders.length === 0) throw new Error('Invalid request: there is no open bill at this table');
  }

  if (!updatedSession && rawTable && !lastDbError) {
    try {
      const { data: newSess, error } = await supabase.from('dine_in_sessions').insert({
        business_id: resolvedBizId, table_number: rawTable, guest_session_id: session_id || `gst_${Date.now()}`,
        status: 'bill_requested', created_at: nowIso, updated_at: nowIso,
      }).select().maybeSingle();
      if (error) lastDbError = error;
      if (newSess) updatedSession = newSess;
    } catch (e) { lastDbError = e; }
  }

  // Never report "bill requested" to the guest when every write failed.
  if (!updatedSession && lastDbError) {
    console.error('[updateGuestSession] bill request not persisted:', lastDbError?.message || lastDbError);
    throw lastDbError instanceof Error ? lastDbError : new Error(lastDbError?.message || 'Failed to record bill request');
  }

  // The history row for the till, and the bell: the BILL call is what rings every host and staff screen and lights
  // Billing in the sidebar (a bill request used to change the session only, and nothing rang).
  await Promise.all([
    processBillRequestEvent(supabase, updatedSession, session_id, resolvedBizId, rawTable, normTable, nowIso),
    ringBillRequest(supabase, resolvedBizId, rawTable || updatedSession?.table_number),
  ]);

  return {
    success: true,
    status: targetStatus,
    session: updatedSession || { id: session_id, table_number: rawTable, status: targetStatus },
  };
}
