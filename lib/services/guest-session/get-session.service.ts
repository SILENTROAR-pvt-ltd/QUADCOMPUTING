import { isValidUuid, normalizeTable, buildTableOrFilter } from './session-utils';
import { resolveSessionKotStatus } from './session-kot.util';

export async function getGuestSession(requestUrl: string, supabase: any) {
  const { searchParams } = new URL(requestUrl);
  const sessionId = searchParams.get('session_id');
  if (!sessionId) throw new Error('Missing session_id');

  const rawT = (searchParams.get('table_number') || '').trim(), normT = normalizeTable(rawT);
  const tableOr = rawT ? buildTableOrFilter(rawT) : '';

  let guestData: any = null;
  try {
    const { data } = await supabase.from('guest_sessions').select('*').eq('session_id', sessionId).maybeSingle();
    if (data) guestData = data;
  } catch {}

  let dineInSessionId = null, sessionStatus: string | null = null;
  if (normT && tableOr) {
    try {
      const { data: s } = await supabase.from('dine_in_sessions').select('id, status, table_number')
        .or(tableOr).in('status', ['open', 'bill_requested']).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (s) { dineInSessionId = s.id; sessionStatus = s.status; }
    } catch {}
  }

  if (!sessionStatus && isValidUuid(sessionId)) {
    try {
      const { data: byId } = await supabase.from('dine_in_sessions').select('id, status, table_number').eq('id', sessionId).maybeSingle();
      if (byId && (!normT || normalizeTable(byId.table_number) === normT)) { dineInSessionId = byId.id; sessionStatus = byId.status; }
    } catch {}
  }

  if (!sessionStatus && sessionId) {
    try {
      let q = supabase.from('dine_in_sessions').select('id, status, table_number').eq('guest_session_id', sessionId);
      if (normT && tableOr) q = q.or(tableOr);
      const { data: byGuestId } = await q.order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (byGuestId && (!normT || normalizeTable(byGuestId.table_number) === normT)) { dineInSessionId = byGuestId.id; sessionStatus = byGuestId.status; }
    } catch {}
  }


  let settledTotal = 0;
  if (sessionStatus === 'closed' && dineInSessionId) {
    try {
      const { data: order } = await supabase.from('orders').select('grand_total, total_amount').eq('session_id', dineInSessionId).order('updated_at', { ascending: false }).limit(1).maybeSingle();
      settledTotal = Number(order?.grand_total || order?.total_amount) || 0;
    } catch {}
  }

  const { kotStatus, ticketNumber } = await resolveSessionKotStatus(supabase, rawT, normT, dineInSessionId);

  return { success: true, guest: guestData, table_number: rawT, dine_in_session_id: dineInSessionId, session_status: sessionStatus || 'open', settled_total: settledTotal, kot_status: kotStatus, ticket_number: ticketNumber };
}
