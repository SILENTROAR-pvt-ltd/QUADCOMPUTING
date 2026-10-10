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

  let session: any = null;
  if (sessionId) {
    session = (await supabase.from('dine_in_sessions').select('*').eq('id', sessionId).eq('business_id', businessId).maybeSingle()).data;
  } else if (tableId || tableOr) {
    session = (await byTable(supabase.from('dine_in_sessions').select('*')).in('status', LIVE_SESSION)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()).data;
  }
  if (session && !LIVE_SESSION.includes(String(session.status ?? '').toLowerCase())) session = null;

  let order: any = null;
  if (orderId) {
    order = (await supabase.from('orders').select('*').eq('id', orderId).eq('business_id', businessId).maybeSingle()).data;
  } else if (session) {
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
