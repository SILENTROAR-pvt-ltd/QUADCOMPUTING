import { CLOSED_STATUSES, normalizeTable, createSessionEntry } from './session-entry.util';

export async function getActiveHostSessions(supabase: any, explicitBusinessId?: string) {
  let businessId: string | null = explicitBusinessId || null;
  if (!businessId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: biz } = await supabase.from('businesses').select('id').eq('host_id', user.id).maybeSingle();
      businessId = biz?.id || null;
    }
  }
  if (!businessId) {
    throw new Error('Business not found');
  }

  // A push to a venue's terminals makes them all read at once; they share one read instead of each running two queries.
  const running = sessionReads.get(businessId);
  if (running) return running;
  const read = readActiveSessions(supabase, businessId).finally(() => { sessionReads.delete(businessId as string); });
  sessionReads.set(businessId, read);
  return read;
}

const sessionReads = new Map<string, Promise<{ success: boolean; sessions: Record<string, any> }>>();

async function readActiveSessions(supabase: any, businessId: string) {
  const [ordsRes, sListRes] = await Promise.all([
    supabase.from('orders').select('*').eq('business_id', businessId)
      .not('status', 'in', `(${CLOSED_STATUSES.map((s) => `"${s}"`).join(',')})`).order('created_at', { ascending: false }),
    supabase.from('dine_in_sessions').select('*').eq('business_id', businessId).in('status', ['open', 'bill_requested']),
  ]);

  const dbOrders = ordsRes?.data || [];
  const dbSessions = sListRes?.data || [];

  const sessionByTable = new Map<string, any>(), sessionById = new Map<string, any>();
  for (const s of dbSessions) {
    if (s.id) sessionById.set(s.id, s);
    if (s.table_id) sessionByTable.set(s.table_id, s);
    if (s.table_number) { sessionByTable.set(s.table_number, s); sessionByTable.set(normalizeTable(s.table_number), s); }
  }

  const sessionMap: Record<string, any> = {}, processedTables = new Set<string>();
  const addEntry = (o: any, tNum: string) => {
    const norm = normalizeTable(tNum);
    if (!norm || processedTables.has(norm)) return;
    const linked = sessionByTable.get(norm) || (o.session_id ? sessionById.get(o.session_id) : null) || (o.table_id ? sessionByTable.get(o.table_id) : null);
    const entry = createSessionEntry(o, linked, tNum);
    if (entry.subtotal > 0 || entry.grandTotal > 0 || entry.itemsCount > 0) {
      processedTables.add(norm); sessionMap[tNum] = entry; sessionMap[norm] = entry;
      sessionMap[`T-${norm}`] = entry; if (linked?.table_id) sessionMap[linked.table_id] = entry;
      if (o.table_id) sessionMap[o.table_id] = entry;
    }
  };

  for (const o of dbOrders) addEntry(o, o.table_number || (o.table_id ? sessionByTable.get(o.table_id)?.table_number : '') || '');

  return { success: true, sessions: sessionMap };
}
