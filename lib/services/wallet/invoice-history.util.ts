/**
 * Pure helpers for the billing invoice history: one row per settled bill, with the platform fee it was charged.
 * Revenue is settled bills only, the same rule the analytics dashboard and the Z-report use.
 */
import { SETTLED_STATUSES } from '@/lib/utils/business-day';

export type FeeStatus = 'deducted' | 'due' | 'cleared' | 'none';

export interface InvoiceOrderRow {
  id: string;
  created_at: string;
  status?: string | null;
  invoice_number?: string | null;
  table_number?: string | null;
  customer_name?: string | null;
  payment_method?: string | null;
  grand_total: number | string | null;
  is_delivery?: boolean | null;
}

export interface FeeOutstandingRow { reference_id: string | null; amount: number | string; status: string }
export interface FeeLedgerRow { reference_id: string | null; cost: number | string }

export interface InvoiceRow {
  id: string;
  invoice_number: string;
  created_at: string;
  where: string;
  guest: string | null;
  payment_method: string | null;
  grand_total: number;
  fee: number;
  fee_status: FeeStatus;
}

const num = (v: unknown) => Number(v) || 0;
const round2 = (n: number) => Math.round(n * 100) / 100;

/** The reference a bill's platform fee is recorded under (settle-session.service.ts charges `SETTLE_<order id>`). */
export const feeReferenceFor = (orderId: string) => `SETTLE_${orderId}`;

export const isSettledStatus = (status: unknown) => (SETTLED_STATUSES as readonly string[]).includes(String(status ?? ''));

/** The bill's own invoice number, or a stable one made from its id and year when it was never given one. */
export function invoiceNumberFor(order: Pick<InvoiceOrderRow, 'id' | 'created_at' | 'invoice_number'>): string {
  const own = String(order.invoice_number ?? '').trim();
  if (own) return own;
  const year = new Date(order.created_at).getUTCFullYear();
  return `QC-${Number.isFinite(year) ? year : new Date().getUTCFullYear()}-${order.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

/** Where the bill was served: its table, or "Delivery" for a delivery bill, or "Counter" when it had neither. */
export function placeFor(order: Pick<InvoiceOrderRow, 'table_number' | 'is_delivery'>): string {
  if (order.is_delivery || /^DLV-/i.test(String(order.table_number ?? ''))) return 'Delivery';
  const table = String(order.table_number ?? '').trim();
  return table ? (/^(table|t-)/i.test(table) ? table : `Table ${table}`) : 'Counter';
}

/** The guest's name unless it is the placeholder "Guest". */
const guestFor = (name: string | null | undefined) => {
  const n = String(name ?? '').trim();
  return n && !/^guest$/i.test(n) ? n : null;
};

/**
 * One row per settled bill. A bill's fee comes from the wallet statement (deducted from credit) or from the dues
 * (still due, or cleared). A bill with neither was free: it was settled under a paid plan, or before fees existed.
 */
export function buildInvoiceRows(orders: InvoiceOrderRow[], outstanding: FeeOutstandingRow[], ledger: FeeLedgerRow[]): InvoiceRow[] {
  const dues = new Map(outstanding.filter((o) => o.reference_id).map((o) => [o.reference_id as string, o]));
  const deducted = new Map(ledger.filter((l) => l.reference_id && num(l.cost) > 0).map((l) => [l.reference_id as string, l]));

  return orders.filter((o) => isSettledStatus(o.status ?? 'settled')).map((o) => {
    const ref = feeReferenceFor(o.id);
    const due = dues.get(ref);
    const paid = deducted.get(ref);
    const fee = due ? num(due.amount) : paid ? num(paid.cost) : 0;
    const fee_status: FeeStatus = due ? (due.status === 'paid' ? 'cleared' : 'due') : paid ? 'deducted' : 'none';
    return {
      id: o.id,
      invoice_number: invoiceNumberFor(o),
      created_at: o.created_at,
      where: placeFor(o),
      guest: guestFor(o.customer_name),
      payment_method: o.payment_method ? String(o.payment_method).toUpperCase() : null,
      grand_total: round2(num(o.grand_total)),
      fee: round2(fee),
      fee_status,
    };
  });
}

/** Total revenue and bill count from settled bills. Cancelled and open bills are not revenue. */
export function sumRevenue(orders: Array<Pick<InvoiceOrderRow, 'status' | 'grand_total'>>) {
  const settled = orders.filter((o) => isSettledStatus(o.status));
  return { revenue: round2(settled.reduce((a, o) => a + num(o.grand_total), 0)), count: settled.length };
}
