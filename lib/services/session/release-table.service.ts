import { closeActiveOrder } from '@/lib/store/active-order-store';
import { CLOSED_STATUSES, buildTableOrFilter } from './session-entry.util';

const LIVE_SESSION = ['open', 'bill_requested'];
const CLOSED_LIST = `(${CLOSED_STATUSES.map((s) => `"${s}"`).join(',')})`;
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

  const { data: orders, error: ordersErr } = await supabase.from('orders').select('id')
    .eq('business_id', businessId).or(tableOr).not('status', 'in', CLOSED_LIST);
  if (ordersErr) throw ordersErr;
  const orderIds: string[] = (orders || []).map((o: any) => o.id);

  if (orderIds.length) {
    const { data: items, error: itemsErr } = await supabase.from('order_items').select('kot_status').in('order_id', orderIds);
    if (itemsErr) throw itemsErr;
    const started = (items || []).some((i: any) => !NOT_STARTED.includes(String(i.kot_status ?? '').toLowerCase()));
    if (started) {
      return { ok: false, status: 409, error: 'The kitchen has started items on this table. Settle the bill instead.' };
    }
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

  closeActiveOrder(businessId, rawTable);
  return { ok: true, status: 'VACANT', message: 'Table is free. Unstarted items were removed.' };
}
