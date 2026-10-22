import { closeActiveOrder } from '@/lib/store/active-order-store';
import { clearBillCalls } from '@/lib/services/guest/bill-call';
import { CLOSED_STATUSES, buildTableOrFilter } from './session-entry.util';

const LIVE_SESSION = ['open', 'bill_requested'];
const CLOSED_LOWER = new Set(CLOSED_STATUSES.map((s: string) => s.toLowerCase()));
// Settled or otherwise finished. A cancelled order is not in this set, so its lines are still checked.
const SETTLED_LIKE = new Set(Array.from(CLOSED_LOWER).filter((s) => s !== 'cancelled'));
// Lines the kitchen has not started. Anything else has been cooked or served and must be settled.
const NOT_STARTED = ['', 'pending', 'cancelled'];

export type ReleaseResult =
  | { ok: true; status: 'VACANT'; message: string }
  | { ok: false; status: number; error: string };

/**
 * Frees a table without taking payment, for guests who left before anything was started. Unstarted
 * items are cancelled with the order. If the kitchen has started anything, the bill must be settled.
 */
export async function releaseTable(body: any, supabase: any, businessId: string): Promise<ReleaseResult> {
  const rawTable = String(body?.table_number || '').trim();
  if (!rawTable) return { ok: false, status: 400, error: 'Choose a table to free.' };
  const tableOr = buildTableOrFilter(rawTable);

  // Every order of the party at this table that was never settled, including one a KOT cancel already marked
  // 'cancelled': its served lines still count, so a cancelled order cannot hide food that was cooked. Only the party now
  // seated counts: a cancelled order from an earlier party (its session long closed) used to block freeing the table
  // for good, so a table could never be marked vacant again after one voided bill.
  const [{ data: orders, error: ordersErr }, { data: liveSessions, error: liveErr }] = await Promise.all([
    supabase.from('orders').select('id, status, session_id').eq('business_id', businessId).or(tableOr),
    supabase.from('dine_in_sessions').select('id').eq('business_id', businessId).in('status', LIVE_SESSION).or(tableOr),
  ]);
  if (ordersErr) throw ordersErr;
  if (liveErr) throw liveErr;
  const seated = new Set((liveSessions || []).map((s: any) => s.id));
  const unsettled = (orders || []).filter((o: any) => {
    const status = String(o.status ?? '').toLowerCase();
    if (status === 'cancelled') return Boolean(o.session_id) && seated.has(o.session_id);
    return !SETTLED_LIKE.has(status);
  });
  const liveIds: string[] = unsettled.map((o: any) => o.id);
  const orderIds: string[] = unsettled.filter((o: any) => !CLOSED_LOWER.has(String(o.status ?? '').toLowerCase())).map((o: any) => o.id);

  if (liveIds.length) {
    const { data: items, error: itemsErr } = await supabase.from('order_items').select('kot_status').in('order_id', liveIds);
    if (itemsErr) throw itemsErr;
    const started = (items || []).some((i: any) => !NOT_STARTED.includes(String(i.kot_status ?? '').toLowerCase()));
    if (started) {
      return { ok: false, status: 409, error: 'The kitchen has started items on this table. Settle the bill instead.' };
    }
  }
  if (orderIds.length) {
    const { error: cancelErr } = await supabase.from('orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .in('id', orderIds).eq('business_id', businessId);
    if (cancelErr) throw cancelErr;
  }

  const { error: sessionErr } = await supabase.from('dine_in_sessions')
    .update({ status: 'closed', updated_at: new Date().toISOString() })
    .eq('business_id', businessId).in('status', LIVE_SESSION).or(tableOr);
  if (sessionErr) throw sessionErr;

  const { error: tableErr } = await supabase.from('restaurant_tables')
    .update({ status: 'VACANT' }).eq('business_id', businessId).or(tableOr);
  if (tableErr) throw tableErr;

  // A freed table no longer wants its bill: the billing screen stops ringing for it. Best-effort.
  const { error: requestErr } = await supabase.from('bill_request_events')
    .update({ settled_at: new Date().toISOString() }).eq('business_id', businessId).or(tableOr).is('settled_at', null);
  if (requestErr) console.error('[releaseTable] Could not clear the bill request:', requestErr.message);
  await clearBillCalls(supabase, businessId, tableOr);

  closeActiveOrder(businessId, rawTable);
  return { ok: true, status: 'VACANT', message: 'Table is free. Unstarted items were removed.' };
}
