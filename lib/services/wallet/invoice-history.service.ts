import { SETTLED_STATUSES } from '@/lib/utils/business-day';
import { selectOrders } from './order-number-column';
import { buildInvoiceRows, feeReferenceFor, sumRevenue, type FeeLedgerRow, type FeeOutstandingRow, type InvoiceRow } from './invoice-history.util';

const BATCH = 1000;
/** A safety stop for the all-time totals: 50,000 bills. Past it the totals say so instead of looking complete. */
const MAX_ROWS = 50_000;

const ORDER_COLUMNS = 'id, created_at, status, invoice_number, table_number, customer_name, payment_method, grand_total, is_delivery';
const CURSOR = /^(\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:?\d{2})?)\|([0-9a-f-]{36})$/i;

export interface InvoiceSummary {
  revenue: number;
  invoiceCount: number;
  /** Platform fees charged across all bills (dues and deductions), and how much of that is still due. */
  feesCharged: number;
  feesDue: number;
  dueCount: number;
  truncated: boolean;
}

/** Reads one column set in batches until the rows run out, so a venue with thousands of bills is still counted in full. */
async function readAll(build: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: any }>) {
  const rows: any[] = [];
  for (let from = 0; rows.length < MAX_ROWS; from += BATCH) {
    const { data, error } = await build(from, from + BATCH - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < BATCH) return { rows, truncated: false };
  }
  return { rows, truncated: true };
}

/** Revenue and fee totals for the whole venue: settled bills only (the analytics rule), and every fee still due. */
export async function fetchInvoiceSummary(db: any, businessId: string): Promise<InvoiceSummary> {
  const [orders, bills, deductions] = await Promise.all([
    readAll((from, to) => db.from('orders').select('status, grand_total').eq('business_id', businessId)
      .in('status', [...SETTLED_STATUSES]).order('created_at', { ascending: false }).order('id').range(from, to)),
    readAll((from, to) => db.from('venue_outstanding_bills').select('amount, status').eq('venue_id', businessId)
      .order('created_at', { ascending: false }).order('id').range(from, to)),
    readAll((from, to) => db.from('usage_ledger').select('cost').eq('venue_id', businessId).eq('action_type', 'bill_generate')
      .order('created_at', { ascending: false }).order('id').range(from, to)),
  ]);
  const { revenue, count } = sumRevenue(orders.rows);
  const unpaid = bills.rows.filter((b) => b.status === 'unpaid');
  const sum = (rows: any[], key: string) => Math.round(rows.reduce((a, r) => a + (Number(r[key]) || 0), 0) * 100) / 100;
  return {
    revenue, invoiceCount: count,
    feesCharged: Math.round((sum(bills.rows, 'amount') + sum(deductions.rows, 'cost')) * 100) / 100,
    feesDue: sum(unpaid, 'amount'), dueCount: unpaid.length,
    truncated: orders.truncated || bills.truncated || deductions.truncated,
  };
}

export interface InvoicePage { invoices: InvoiceRow[]; nextCursor: string | null }

/** One page of settled bills, newest first, each with the platform fee it was charged. `cursor` is `<created_at>|<id>`. */
export async function fetchInvoicePage(db: any, businessId: string, cursor: string | null, limit: number): Promise<InvoicePage> {
  const size = Math.min(Math.max(Math.floor(limit) || 25, 1), 100);
  const match = cursor ? CURSOR.exec(cursor) : null;
  if (cursor && !match) throw Object.assign(new Error('Invalid page position.'), { status: 400 });
  const { data, error } = await selectOrders(ORDER_COLUMNS, (columns) => {
    let query = db.from('orders').select(columns).eq('business_id', businessId).in('status', [...SETTLED_STATUSES])
      .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(size + 1);
    if (match) query = query.or(`created_at.lt.${match[1]},and(created_at.eq.${match[1]},id.lt.${match[2]})`);
    return query;
  });
  if (error) throw error;
  const rows = (data ?? []) as any[];
  const more = rows.length > size;
  const page = rows.slice(0, size);

  const refs = page.map((o) => feeReferenceFor(o.id));
  const [dues, ledger] = refs.length
    ? await Promise.all([
        db.from('venue_outstanding_bills').select('reference_id, amount, status').eq('venue_id', businessId).in('reference_id', refs),
        db.from('usage_ledger').select('reference_id, cost').eq('venue_id', businessId).eq('action_type', 'bill_generate').in('reference_id', refs),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (dues.error) throw dues.error;
  // The statement is only extra detail: a failed read leaves those bills showing no fee rather than hiding the invoices.
  if (ledger.error) console.warn('[invoice-history] usage ledger read failed', ledger.error.message);

  const last = page[page.length - 1];
  return {
    invoices: buildInvoiceRows(page, (dues.data ?? []) as FeeOutstandingRow[], (ledger.data ?? []) as FeeLedgerRow[]),
    nextCursor: more && last ? `${last.created_at}|${last.id}` : null,
  };
}
