import { SETTLED_STATUSES } from '@/lib/utils/business-day';
import { billingRangeBounds } from './billing-day';
import { buildDaySlips, type DaySlip, type SlipFilters, type SlipTotals } from './day-slips.util';
import { buildInvoiceRows, feeReferenceFor, type FeeLedgerRow, type FeeOutstandingRow } from './invoice-history.util';

const ORDER_COLUMNS = 'id, created_at, status, invoice_number, table_number, customer_name, payment_method, grand_total, is_delivery';
const BATCH = 1000;
/** The most bills one request reads. A longer range says it was cut short instead of showing partial totals as whole. */
export const SLIP_ROW_CAP = 3000;
/** References per `in (...)` lookup, kept well under URL length limits. */
const REF_CHUNK = 150;

export interface SlipRange { from: string | null; to: string | null }
export interface SlipResult { days: DaySlip[]; totals: SlipTotals; truncated: boolean }

async function readOrders(db: any, businessId: string, range: SlipRange) {
  const bounds = range.from && range.to ? billingRangeBounds(range.from, range.to) : null;
  const rows: any[] = [];
  for (let from = 0; rows.length < SLIP_ROW_CAP; from += BATCH) {
    let q = db.from('orders').select(ORDER_COLUMNS).eq('business_id', businessId).in('status', [...SETTLED_STATUSES]);
    if (bounds) q = q.gte('created_at', bounds.start.toISOString()).lt('created_at', bounds.end.toISOString());
    const { data, error } = await q.order('created_at', { ascending: false }).order('id', { ascending: false }).range(from, from + BATCH - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < BATCH) return { rows, truncated: false };
  }
  return { rows: rows.slice(0, SLIP_ROW_CAP), truncated: true };
}

async function readFees(db: any, businessId: string, refs: string[]) {
  const dues: FeeOutstandingRow[] = [];
  const ledger: FeeLedgerRow[] = [];
  for (let i = 0; i < refs.length; i += REF_CHUNK) {
    const chunk = refs.slice(i, i + REF_CHUNK);
    const [d, l] = await Promise.all([
      db.from('venue_outstanding_bills').select('reference_id, amount, status').eq('venue_id', businessId).in('reference_id', chunk),
      db.from('usage_ledger').select('reference_id, cost').eq('venue_id', businessId).eq('action_type', 'bill_generate').in('reference_id', chunk),
    ]);
    if (d.error) throw d.error;
    // The wallet statement only adds detail: if it cannot be read those bills show no fee rather than failing the slip.
    if (l.error) console.warn('[day-slips] usage ledger read failed', l.error.message);
    dues.push(...(d.data ?? []));
    ledger.push(...(l.data ?? []));
  }
  return { dues, ledger };
}

/** Every settled bill in the billing-day range (or all time), with its fee, gathered into daily due slips. */
export async function fetchDaySlips(db: any, businessId: string, range: SlipRange, filters: SlipFilters): Promise<SlipResult> {
  const { rows, truncated } = await readOrders(db, businessId, range);
  const { dues, ledger } = await readFees(db, businessId, rows.map((o) => feeReferenceFor(o.id)));
  const { days, totals } = buildDaySlips(buildInvoiceRows(rows, dues, ledger), filters);
  return { days, totals, truncated };
}
