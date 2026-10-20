import { buildTableOrFilter } from './session-entry.util';
import { IS_UUID, type SettlementInput } from './settle-input';

const ORDER_COLUMNS = 'id, business_id, session_id, table_id, table_number, customer_name, customer_phone, grand_total, subtotal, status';
// Columns that exist on the deployed dine_in_sessions. It has no guest_name:
// selecting it made every session lookup here fail, so the guest's handle was
// never found and cashback was credited under their phone/name instead of the
// @handle their wallet reads.
const SESSION_GUEST_COLUMNS = 'id, business_id, table_id, table_number, guest_handle, guest_session_id, status';

const SETTLED = new Set(['settled', 'completed', 'paid', 'closed', 'billed']);
export const isSettledStatus = (status: unknown) => SETTLED.has(String(status || '').toLowerCase());

/** The visit was already paid: a second bill for it is refused here, and again inside the settlement function. */
export function sessionAlreadySettled(sessionId: string | null): Error {
  return Object.assign(
    new Error('This table\'s visit was already settled. Start a new session for a new bill.'),
    { status: 409, code: 'SESSION_ALREADY_SETTLED', details: { session_id: sessionId } },
  );
}

export interface SettlementContext {
  rawTable: string;
  tableOr: string;
  tableId: string | null;
  sessionId: string | null;
  sessionGuestName: string | null;
  order: any | null;
}

/** The venue being settled: the one the host route already signed in, else the caller's own business. */
export async function resolveBusinessId(input: SettlementInput, supabase: any): Promise<string> {
  if (input.businessId) return input.businessId;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: b } = await supabase.from('businesses').select('id').eq('host_id', user.id).maybeSingle();
      if (b?.id) return b.id;
    }
  } catch {}
  return '';
}

/** The order, table and dine-in session the bill belongs to, each only from the caller's own venue. */
export async function resolveSettlementContext(input: SettlementInput, businessId: string, supabase: any): Promise<SettlementContext> {
  let rawTable = input.rawTable;
  let tableId = input.tableId;
  let sessionId = input.sessionId;
  let sessionGuestName: string | null = null;
  let order: any = null;

  if (input.orderId) {
    try {
      const { data: ord } = await supabase.from('orders').select(ORDER_COLUMNS)
        .eq('id', input.orderId).eq('business_id', businessId).maybeSingle();
      if (ord) {
        order = ord;
        if (!sessionId && ord.session_id) sessionId = ord.session_id;
        if (!tableId && ord.table_id) tableId = ord.table_id;
        if (!rawTable && ord.table_number) rawTable = ord.table_number;
      }
    } catch {}
  }

  const tableOr = rawTable ? buildTableOrFilter(rawTable) : '';
  if (tableId) {
    const { data: t } = await supabase.from('restaurant_tables').select('id, business_id, table_number')
      .eq('id', tableId).eq('business_id', businessId).maybeSingle();
    if (t) { if (!rawTable) rawTable = t.table_number || rawTable; } else { tableId = null; }
  } else if (rawTable && tableOr) {
    const { data: t } = await supabase.from('restaurant_tables').select('id, business_id')
      .eq('business_id', businessId).or(tableOr).limit(1).maybeSingle();
    if (t?.id && IS_UUID(t.id)) tableId = t.id;
  }

  // The dine-in session is shared by everyone at the table, so its guest_handle is never used for cashback (it
  // credited the whole table to whoever claimed it). The cashback owner comes from who ordered each dish, instead.
  const adopt = (s: any) => {
    sessionGuestName = sessionGuestName || s.guest_name || null;
    tableId = tableId || (IS_UUID(s.table_id) ? s.table_id : null);
    if (!rawTable) rawTable = s.table_number || '';
  };

  if (sessionId) {
    // Only a session of the caller's own venue counts. A session id from another venue is treated as not found.
    const { data: s } = await supabase.from('dine_in_sessions').select(SESSION_GUEST_COLUMNS)
      .eq('id', sessionId).eq('business_id', businessId).maybeSingle();
    // A closed session is a paid visit. Its own settled order may be replayed (the till retrying after a timeout);
    // any other order against it is a second bill for the same visit and is refused.
    if (s && String(s.status || '').toLowerCase() === 'closed' && !(order && isSettledStatus(order.status))) {
      throw sessionAlreadySettled(sessionId);
    }
    if (s) adopt(s);
  } else if (tableId || rawTable) {
    let q = supabase.from('dine_in_sessions').select(SESSION_GUEST_COLUMNS).eq('business_id', businessId)
      .in('status', ['open', 'bill_requested']).order('created_at', { ascending: false }).limit(1);
    q = tableId ? q.eq('table_id', tableId) : q.eq('business_id', businessId).or(tableOr);
    const { data: s } = await q.maybeSingle();
    if (s) { adopt(s); sessionId = s.id; }
  }

  return { rawTable, tableOr, tableId, sessionId, sessionGuestName, order };
}

/** The order the bill is for when the caller did not name one: the latest of the session, else of the table. */
export async function resolveOpenOrder(ctx: SettlementContext, businessId: string, supabase: any): Promise<any> {
  if (ctx.order || !(ctx.sessionId || ctx.rawTable)) return ctx.order;
  const q = ctx.sessionId
    ? supabase.from('orders').select(ORDER_COLUMNS).eq('session_id', ctx.sessionId).eq('business_id', businessId)
      .order('created_at', { ascending: false }).limit(1)
    : supabase.from('orders').select(ORDER_COLUMNS).eq('business_id', businessId).or(ctx.tableOr)
      .order('created_at', { ascending: false }).limit(1);
  const { data: ord, error } = await q.maybeSingle();
  if (error) throw error;
  return ord || ctx.order;
}
