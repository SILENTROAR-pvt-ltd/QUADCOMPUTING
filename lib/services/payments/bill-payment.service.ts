import {
  LIVE_STATUSES,
  canTransition,
  payableAfterWallet,
  remainingToPay,
  type BillPayment,
  type PaymentMethod,
  type PaymentStatus,
} from './bill-payment.rules';

const PAID_STATUSES = ['verified', 'settled'];

// The database side of a table's bill payment. Every function takes the Supabase client of its caller (the guest routes pass
// the service client, the host routes the signed-in host's), so who may do what is decided by the route, not here.

const CLOSED_ORDER = '("settled","SETTLED","completed","COMPLETED","cancelled","CANCELLED","billed","BILLED","closed","CLOSED","paid","PAID")';

/** The table is not there yet because the migration has not been applied: callers fall back to the old flow. */
export function isTableMissing(error: any): boolean {
  const code = String(error?.code || '');
  const msg = String(error?.message || '').toLowerCase();
  return code === '42P01' || code === 'PGRST205' || (msg.includes('bill_payments') && (msg.includes('does not exist') || msg.includes('schema cache')));
}

const numeric = (row: any): BillPayment => ({ ...row, amount: Number(row.amount) || 0, wallet_amount: Number(row.wallet_amount) || 0 });

export async function findLivePayment(db: any, businessId: string, tableNumber: string): Promise<{ payment: BillPayment | null; missing: boolean }> {
  const { data, error } = await db.from('bill_payments').select('*')
    .eq('business_id', businessId).eq('table_number', tableNumber).in('status', LIVE_STATUSES as unknown as string[])
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) {
    if (isTableMissing(error)) return { payment: null, missing: true };
    throw error;
  }
  return { payment: data ? numeric(data) : null, missing: false };
}

/** How much of an order has already been paid and confirmed by staff (money received, whatever the method). */
export async function paidForOrder(db: any, businessId: string, orderId: string | null | undefined, excludeId?: string): Promise<number> {
  if (!orderId) return 0;
  let q = db.from('bill_payments').select('amount, wallet_amount')
    .eq('business_id', businessId).eq('order_id', orderId).in('status', PAID_STATUSES);
  if (excludeId) q = q.neq('id', excludeId);
  const { data, error } = await q;
  if (error) {
    if (isTableMissing(error)) return 0;
    throw error;
  }
  return (data || []).reduce((sum: number, r: any) => sum + (Number(r.amount) || 0) + (Number(r.wallet_amount) || 0), 0);
}

/** The most recent payment's status for a table, however it ended: how a guest's screen knows "settled" from "cancelled". */
export async function findLatestStatus(db: any, businessId: string, tableNumber: string): Promise<PaymentStatus | null> {
  const { data, error } = await db.from('bill_payments').select('status')
    .eq('business_id', businessId).eq('table_number', tableNumber).order('updated_at', { ascending: false }).limit(1).maybeSingle();
  if (error) {
    if (isTableMissing(error)) return null;
    throw error;
  }
  return (data?.status as PaymentStatus) ?? null;
}

/** Adds, to each live payment, what was already paid and confirmed earlier on the same bill, so staff collect only what is left. */
export async function attachPaidBefore(db: any, businessId: string, payments: BillPayment[]): Promise<BillPayment[]> {
  return Promise.all(payments.map(async (p) => {
    if (!p.order_id) return { ...p, paid_before: 0 };
    try {
      return { ...p, paid_before: await paidForOrder(db, businessId, p.order_id, p.id) };
    } catch {
      return { ...p, paid_before: 0 };
    }
  }));
}

/** The bill the guest is paying: the table's open order, from the database. Never a figure sent by the phone. */
export async function openBillForTable(db: any, businessId: string, tableNumber: string, sessionId?: string | null) {
  const query = () => db.from('orders').select('id, session_id, grand_total, total_amount, subtotal')
    .eq('business_id', businessId).not('status', 'in', CLOSED_ORDER).order('created_at', { ascending: false }).limit(1);
  let order: any = null;
  if (sessionId) ({ data: order } = await query().eq('session_id', sessionId).maybeSingle());
  if (!order) {
    const raw = tableNumber.trim();
    const norm = raw.replace(/^(table|t-)\s*/i, '').trim();
    ({ data: order } = await query().or(`table_number.eq.${raw},table_number.eq.Table ${raw},table_number.eq.T-${norm}`).maybeSingle());
  }
  if (!order) return null;
  const total = Number(order.grand_total || order.total_amount || order.subtotal || 0);
  return { orderId: String(order.id), sessionId: order.session_id ? String(order.session_id) : null, total };
}

export interface ChooseInput {
  businessId: string;
  tableNumber: string;
  method: PaymentMethod;
  total: number;
  walletAmount?: number;
  orderId?: string | null;
  sessionId?: string | null;
  guestHandle?: string | null;
}

/**
 * Records how the guest will pay. A second choice updates the table's live payment instead of adding another, and a payment
 * staff have already confirmed is left as it is.
 */
export async function choosePayment(db: any, input: ChooseInput): Promise<{ payment: BillPayment | null; missing: boolean }> {
  const existing = await findLivePayment(db, input.businessId, input.tableNumber);
  if (existing.missing) return { payment: null, missing: true };

  // Only what is still owed is asked for. Money already confirmed on this bill (before the guest added more) is never
  // asked for again, and an add-on is never shown as paid.
  const paid = await paidForOrder(db, input.businessId, input.orderId ?? existing.payment?.order_id ?? null);
  const remaining = remainingToPay(input.total, paid);
  const { amount, wallet } = payableAfterWallet(remaining, input.walletAmount || 0);

  const now = new Date().toISOString();
  if (existing.payment) {
    if (existing.payment.status === 'verified') {
      // Nothing more is owed: the confirmed payment stands.
      if (remaining <= 0.5) return { payment: existing.payment, missing: false };
      // The bill grew after it was paid: the confirmed payment is closed as it is (the money was received), and a new
      // payment starts for the new part only.
      const { error: closeErr } = await db.from('bill_payments')
        .update({ status: 'settled', settled_at: now, updated_at: now })
        .eq('id', existing.payment.id).eq('business_id', input.businessId).eq('status', 'verified');
      if (closeErr) throw closeErr;
      return insertPayment(db, input, amount, wallet, now);
    }
    const { data, error } = await db.from('bill_payments').update({
      method: input.method, amount, wallet_amount: wallet, status: 'chosen', claimed_at: null,
      order_id: input.orderId ?? existing.payment.order_id, session_id: input.sessionId ?? existing.payment.session_id, updated_at: now,
    }).eq('id', existing.payment.id).eq('business_id', input.businessId).select('*').maybeSingle();
    if (error) throw error;
    return { payment: data ? numeric(data) : existing.payment, missing: false };
  }

  return insertPayment(db, input, amount, wallet, now);
}

async function insertPayment(db: any, input: ChooseInput, amount: number, wallet: number, now: string): Promise<{ payment: BillPayment | null; missing: boolean }> {
  const { data, error } = await db.from('bill_payments').insert({
    business_id: input.businessId, table_number: input.tableNumber, method: input.method, amount, wallet_amount: wallet,
    order_id: input.orderId ?? null, session_id: input.sessionId ?? null, guest_handle: input.guestHandle ?? null,
    status: 'chosen', created_at: now, updated_at: now,
  }).select('*').maybeSingle();
  if (error) {
    if (isTableMissing(error)) return { payment: null, missing: true };
    throw error;
  }
  return { payment: data ? numeric(data) : null, missing: false };
}

/** Moves a payment forward if the move is allowed. Returns the row, or null when it was not (already moved on, or not there). */
export async function movePayment(
  db: any,
  businessId: string,
  id: string,
  to: PaymentStatus,
  extra: Record<string, unknown> = {},
): Promise<BillPayment | null> {
  const { data: current, error: readErr } = await db.from('bill_payments').select('*').eq('id', id).eq('business_id', businessId).maybeSingle();
  if (readErr) throw readErr;
  if (!current || !canTransition(current.status, to)) return null;
  const { data, error } = await db.from('bill_payments')
    .update({ status: to, updated_at: new Date().toISOString(), ...extra })
    .eq('id', id).eq('business_id', businessId).eq('status', current.status).select('*').maybeSingle();
  if (error) throw error;
  return data ? numeric(data) : null;
}

export const claimPayment = (db: any, businessId: string, id: string) =>
  movePayment(db, businessId, id, 'claimed', { claimed_at: new Date().toISOString() });

export const verifyPayment = (db: any, businessId: string, id: string, by: string) =>
  movePayment(db, businessId, id, 'verified', { verified_at: new Date().toISOString(), verified_by: by });

export const cancelPayment = (db: any, businessId: string, id: string) => movePayment(db, businessId, id, 'cancelled');

/** Every live payment of the venue, for the waiter's tables and the billing POS. */
export async function listLivePayments(db: any, businessId: string): Promise<{ payments: BillPayment[]; missing: boolean }> {
  const { data, error } = await db.from('bill_payments').select('*')
    .eq('business_id', businessId).in('status', LIVE_STATUSES as unknown as string[]).order('created_at', { ascending: false }).limit(100);
  if (error) {
    if (isTableMissing(error)) return { payments: [], missing: true };
    throw error;
  }
  return { payments: (data || []).map(numeric), missing: false };
}

/** Called after a bill is settled: closes the table's live payment. Best-effort, so a hiccup here never undoes a settlement. */
export async function markPaymentSettled(db: any, businessId: string, ref: { sessionId?: string | null; orderId?: string | null; tableNumber?: string | null }) {
  try {
    const now = new Date().toISOString();
    let q = db.from('bill_payments').update({ status: 'settled', settled_at: now, updated_at: now })
      .eq('business_id', businessId).in('status', LIVE_STATUSES as unknown as string[]);
    if (ref.sessionId) q = q.eq('session_id', ref.sessionId);
    else if (ref.orderId) q = q.eq('order_id', ref.orderId);
    else if (ref.tableNumber) q = q.eq('table_number', ref.tableNumber);
    else return;
    const { error } = await q;
    if (error && !isTableMissing(error)) console.error('[Payments] Could not close the payment after settlement:', error.message);
  } catch (e: any) {
    console.error('[Payments] Could not close the payment after settlement:', e?.message || e);
  }
}
