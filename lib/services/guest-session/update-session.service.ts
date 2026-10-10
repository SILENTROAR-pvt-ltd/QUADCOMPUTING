import { isValidUuid, normalizeTable } from './session-utils';
import { processBillRequestEvent } from './bill-request-event.util';

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

  if (isValidUuid(session_id)) {
    try {
      const { data: updated, error } = await supabase.from('dine_in_sessions').update({ status: targetStatus, updated_at: nowIso })
        .eq('id', session_id).eq('business_id', resolvedBizId).select().maybeSingle();
      if (error) lastDbError = error;
      if (updated) updatedSession = updated;
    } catch (e) { lastDbError = e; }
  }

  if (!updatedSession && rawTable) {
    try {
      const { data: updated, error } = await supabase.from('dine_in_sessions').update({ status: targetStatus, updated_at: nowIso })
        .eq('business_id', resolvedBizId).or(`table_number.eq.${rawTable},table_number.eq.Table ${rawTable},table_number.eq.T-${normTable}`)
        .in('status', ['open', 'bill_requested']).select().maybeSingle();
      if (error) lastDbError = error;
      if (updated) updatedSession = updated;
    } catch (e) { lastDbError = e; }
  }

  if (!updatedSession && rawTable) {
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

  if (targetStatus === 'bill_requested') {
    await processBillRequestEvent(supabase, updatedSession, session_id, resolvedBizId, rawTable, normTable, nowIso);
  }

  return {
    success: true,
    status: targetStatus,
    session: updatedSession || { id: session_id, table_number: rawTable, status: targetStatus },
  };
}
