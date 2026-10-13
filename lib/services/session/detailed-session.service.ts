import { aggregateOrderItems } from '@/lib/utils/qr-session';
import { CLOSED_STATUSES, buildTableOrFilter } from './session-entry.util';

// The database is the only source for a table's live bill. The in-memory order store survives
// settlement and can hold a previous guest, so it is never read here.
const LIVE_SESSION = ['open', 'bill_requested'];
const CLOSED_LIST = `(${CLOSED_STATUSES.map((s) => `"${s}"`).join(',')})`;
const EMPTY = { success: true, session: null, order: null, items: [], aggregated: [] };

export async function getDetailedHostSession(requestUrl: string, supabase: any, explicitBusinessId?: string) {
  const sp = new URL(requestUrl).searchParams;
  const businessId = explicitBusinessId || sp.get('business_id') || sp.get('cafe_id') || '';
  const sessionId = sp.get('session_id');
  const orderId = sp.get('order_id');
  const tableId = sp.get('table_id');
  const rawTable = (sp.get('table_number') || '').trim();
  const tableOr = rawTable ? buildTableOrFilter(rawTable) : '';
  if (!businessId || !(sessionId || orderId || tableId || tableOr)) return EMPTY;

  const byTable = (q: any) => {
    const scoped = q.eq('business_id', businessId);
    if (tableId && tableOr) return scoped.or(`table_id.eq.${tableId},${tableOr}`);
    if (tableId) return scoped.eq('table_id', tableId);
    return scoped.or(tableOr);
  };

  const sessionQuery = () => sessionId
    ? supabase.from('dine_in_sessions').select('*').eq('id', sessionId).eq('business_id', businessId).maybeSingle()
    : byTable(supabase.from('dine_in_sessions').select('*')).in('status', LIVE_SESSION)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();

  // The POS almost always knows the order (from the polled table list): read the session, the order and its dishes
  // at once instead of one after another. The dishes are used only if the order is this venue's.
  if (orderId) {
    const [sessionRes, orderRes, itemsRes] = await Promise.all([
      sessionId || tableId || tableOr ? sessionQuery() : Promise.resolve({ data: null }),
      supabase.from('orders').select('*').eq('id', orderId).eq('business_id', businessId).maybeSingle(),
      supabase.from('order_items').select('*').eq('order_id', orderId).order('created_at', { ascending: true }),
    ]);
    let fastSession: any = sessionRes?.data ?? null;
    if (fastSession && !LIVE_SESSION.includes(String(fastSession.status ?? '').toLowerCase())) fastSession = null;
    let fastOrder: any = orderRes?.data ?? null;
    if (fastOrder && CLOSED_STATUSES.includes(String(fastOrder.status ?? '').toLowerCase())) fastOrder = null;
    if (!fastSession && !fastOrder) return EMPTY;
    const rows = fastOrder ? itemsRes?.data : null;
    const fastItems = rows?.length ? rows : Array.isArray(fastOrder?.items) ? fastOrder.items : Array.isArray(fastOrder?.raw_items) ? fastOrder.raw_items : [];
    return { success: true, session: fastSession, order: fastOrder, items: fastItems, aggregated: aggregateOrderItems(fastItems) };
  }

  let session: any = null;
  if (sessionId || tableId || tableOr) session = (await sessionQuery()).data;
  if (session && !LIVE_SESSION.includes(String(session.status ?? '').toLowerCase())) session = null;

  let order: any = null;
  if (session) {
    order = (await supabase.from('orders').select('*').eq('session_id', session.id).eq('business_id', businessId)
      .not('status', 'in', CLOSED_LIST).order('created_at', { ascending: false }).limit(1).maybeSingle()).data;
  } else if (tableId || tableOr) {
    order = (await byTable(supabase.from('orders').select('*')).not('status', 'in', CLOSED_LIST)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()).data;
  }
  if (order && CLOSED_STATUSES.includes(String(order.status ?? '').toLowerCase())) order = null;

  if (!session && !order) return EMPTY;

  let items: any[] = [];
  if (order?.id) {
    const { data: rows } = await supabase.from('order_items').select('*').eq('order_id', order.id).order('created_at', { ascending: true });
    items = rows?.length ? rows : Array.isArray(order.items) ? order.items : Array.isArray(order.raw_items) ? order.raw_items : [];
  }
  return { success: true, session, order, items, aggregated: aggregateOrderItems(items) };
}

export async function fetchActiveSessionLines(bodyOrUrl: any, supabase: any) {
  if (typeof bodyOrUrl === 'string') return getDetailedHostSession(bodyOrUrl, supabase);
  const p = new URLSearchParams();
  ['session_id', 'table_number', 'table_id', 'order_id'].forEach((k) => { if (bodyOrUrl?.[k]) p.set(k, bodyOrUrl[k]); });
  return getDetailedHostSession(`http://localhost?${p.toString()}`, supabase, bodyOrUrl?.business_id);
}
