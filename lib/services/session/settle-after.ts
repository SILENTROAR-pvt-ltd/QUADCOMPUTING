import { broadcastToGuestTable } from '@/lib/realtime/channels';
import { recordLedgerVisit } from '@/lib/services/live-events/ledger.service';
import { clearBillCalls } from '@/lib/services/guest/bill-call';
import { IS_UUID } from './settle-input';

export interface SettledBill {
  supabase: any;
  businessId: string;
  orderId: string | null;
  orderSessionId: string | null;
  sessionId: string | null;
  rawTable: string;
  tableOr: string;
  guestHandle: string | null;
  guestPhone: string | null;
  guestName: string | null;
  settledTotal: number;
  nowIso: string;
}

const OPEN_STATUSES = ['open', 'bill_requested'];

/** Once settled, a live session left at the table with no unbilled order of its own is closed (see the note in the service). */
async function closeStraySessions(b: SettledBill) {
  const [{ data: live }, { data: openOrders }] = await Promise.all([
    b.supabase.from('dine_in_sessions').select('id').eq('business_id', b.businessId).or(b.tableOr).in('status', OPEN_STATUSES),
    b.supabase.from('orders').select('session_id').eq('business_id', b.businessId).or(b.tableOr)
      .not('status', 'in', '("settled","SETTLED","completed","COMPLETED","cancelled","CANCELLED","billed","closed","CLOSED")'),
  ]);
  const billed = new Set((openOrders || []).map((o: any) => o.session_id).filter(Boolean));
  const stray = (live || []).map((s: any) => s.id).filter((id: string) => !billed.has(id));
  if (stray.length === 0) return;
  await b.supabase.from('dine_in_sessions').update({ status: 'closed', updated_at: b.nowIso }).in('id', stray).eq('business_id', b.businessId);
}

/** Best-effort leftovers: the settled order's session, other open orders, and bill requests. Logged, never blocking. */
async function cleanUp(b: SettledBill) {
  try {
    // The settled order's own session must close too. The settlement closes the session it was given, which can be a
    // different one; the order's session then stayed open for good, and the next guest at the table joined it.
    await Promise.all([
      IS_UUID(b.orderSessionId) && b.orderSessionId !== b.sessionId
        ? b.supabase.from('dine_in_sessions').update({ status: 'closed', updated_at: b.nowIso }).eq('id', b.orderSessionId).eq('business_id', b.businessId)
        : null,
      b.sessionId
        ? b.supabase.from('orders').update({ status: 'settled' })
          .eq('session_id', b.sessionId).neq('id', b.orderId || '')
          .not('status', 'in', '("settled","SETTLED","completed","COMPLETED","cancelled","CANCELLED")')
        : null,
      b.sessionId
        ? b.supabase.from('bill_request_events').update({ settled_at: b.nowIso }).eq('session_id', b.sessionId).is('settled_at', null)
        : null,
      b.rawTable && b.tableOr
        ? b.supabase.from('bill_request_events').update({ settled_at: b.nowIso }).eq('business_id', b.businessId).or(b.tableOr).is('settled_at', null)
        : null,
      b.rawTable && b.tableOr ? closeStraySessions(b) : null,
      // The paid table's "asked for the bill" call leaves the bell tray.
      b.rawTable && b.tableOr ? clearBillCalls(b.supabase, b.businessId, b.tableOr) : null,
    ]);
  } catch (cleanupErr) {
    console.error('[Settlement] Secondary cleanup (stray orders / bill requests) failed:', cleanupErr);
  }
}

/** The bill's owner, recorded once at settlement; the guest's invoices are read from it. Best-effort. */
async function recordOwner(b: SettledBill) {
  const ownerHandle = typeof b.guestHandle === 'string' ? b.guestHandle.trim().toLowerCase() : '';
  if (!(b.orderId && ownerHandle.startsWith('@'))) return;
  const { error } = await b.supabase.from('orders').update({ guest_handle: ownerHandle }).eq('id', b.orderId).eq('business_id', b.businessId);
  if (error && !['42703', 'PGRST204'].includes(error.code)) console.error('[Settlement] Could not record the bill owner:', error);
}

/** Recipe-driven stock deduction. A failure does not block settlement: the guest has been billed, and ops reconcile it. */
async function deductStock(b: SettledBill): Promise<any> {
  if (!b.orderId) return { success: true };
  const { deductInventoryForOrder } = await import('@/lib/services/inventory/recipe-deduction.service');
  try {
    return await deductInventoryForOrder(b.supabase, b.orderId, b.businessId);
  } catch (invErr: any) {
    console.error('[Settlement] Inventory deduction failed for order', b.orderId, invErr);
    return { success: false, error: invErr?.message || String(invErr) };
  }
}

/** The platform fee. The POS is never blocked by a fee failure: it lands in venue_outstanding_bills instead (fee-guard). */
async function chargeFee(b: SettledBill): Promise<any> {
  if (!(b.businessId && b.orderId)) return null;
  const { evaluateFeeGuard } = await import('@/lib/services/wallet/fee-guard.service');
  try {
    return await evaluateFeeGuard(b.businessId, 'bill_generate', `SETTLE_${b.orderId}`, b.supabase);
  } catch (feeErr) {
    console.error('[Settlement] Platform fee could not be evaluated for order', b.orderId, feeErr);
    return null;
  }
}

/**
 * Everything that follows the atomic settlement. The bookkeeping steps are independent, so they run together. The
 * realtime ping is last: the topic is public, so it is empty, and the phone reads its own bill.
 */
export async function runAfterSettlement(b: SettledBill): Promise<{ inventory: any; platformFee: any }> {
  const [, , inventory, platformFee] = await Promise.all([
    recordOwner(b),
    cleanUp(b),
    deductStock(b),
    chargeFee(b),
    // My Guests: every settled bill is a visit for the guest who paid it, signed in or walk-in (see ledger.service.ts).
    recordLedgerVisit(b.supabase, b.businessId, b.orderId, { handle: b.guestHandle, phone: b.guestPhone, name: b.guestName }, b.settledTotal, b.nowIso),
  ]);
  await broadcastToGuestTable(b.supabase, b.businessId, b.rawTable, 'table_settled');
  return { inventory, platformFee };
}
