/** Pure: filter settled bills and gather them into one due slip per billing day (10 AM to 10 PM, closing at 10 PM). */
import { billingDayOf, inOperatingWindow } from './billing-day';
import type { InvoiceRow } from './invoice-history.util';

export type FeeFilter = 'all' | 'due' | 'paid' | 'none';
export const FEE_FILTERS: FeeFilter[] = ['all', 'due', 'paid', 'none'];
export const PAYMENT_FILTERS = ['all', 'UPI', 'CASH', 'CARD', 'OTHER'] as const;
export type PaymentFilter = (typeof PAYMENT_FILTERS)[number];

export interface SlipFilters { fee: FeeFilter; payment: PaymentFilter; q: string }

export interface SlipRow extends InvoiceRow { after_hours: boolean }
// InvoiceRow already carries the order id as `id`, which the invoice view uses.

export interface SlipTotals { bills: number; revenue: number; fees: number; feesDue: number; feesPaid: number; afterHours: number }

export interface DaySlip extends SlipTotals { day: string; rows: SlipRow[] }

const round2 = (n: number) => Math.round(n * 100) / 100;
const KNOWN = new Set(['UPI', 'CASH', 'CARD']);

export function matchesFilters(row: InvoiceRow, f: SlipFilters): boolean {
  if (f.fee === 'due' && row.fee_status !== 'due') return false;
  if (f.fee === 'paid' && row.fee_status !== 'deducted' && row.fee_status !== 'cleared') return false;
  if (f.fee === 'none' && row.fee_status !== 'none') return false;
  const method = (row.payment_method || '').toUpperCase();
  if (f.payment === 'OTHER' ? KNOWN.has(method) : f.payment !== 'all' && method !== f.payment) return false;
  const q = f.q.trim().toLowerCase();
  if (q && ![row.invoice_number, row.where, row.guest ?? ''].some((v) => v.toLowerCase().includes(q))) return false;
  return true;
}

function totalsOf(rows: SlipRow[]): SlipTotals {
  const sum = (pick: (r: SlipRow) => number) => round2(rows.reduce((a, r) => a + pick(r), 0));
  return {
    bills: rows.length,
    revenue: sum((r) => r.grand_total),
    fees: sum((r) => r.fee),
    feesDue: sum((r) => (r.fee_status === 'due' ? r.fee : 0)),
    feesPaid: sum((r) => (r.fee_status === 'deducted' || r.fee_status === 'cleared' ? r.fee : 0)),
    afterHours: rows.filter((r) => r.after_hours).length,
  };
}

/** Newest day first, newest bill first within a day. Totals are of the filtered bills. */
export function buildDaySlips(rows: InvoiceRow[], filters: SlipFilters): { days: DaySlip[]; totals: SlipTotals } {
  const kept: SlipRow[] = rows.filter((r) => matchesFilters(r, filters))
    .map((r) => ({ ...r, after_hours: !inOperatingWindow(r.created_at) }))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  const byDay = new Map<string, SlipRow[]>();
  for (const r of kept) {
    const day = billingDayOf(r.created_at);
    byDay.set(day, [...(byDay.get(day) ?? []), r]);
  }
  const days = Array.from(byDay.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, dayRows]) => ({ day, rows: dayRows, ...totalsOf(dayRows) }));
  return { days, totals: totalsOf(kept) };
}

/** Reads filters from query parameters, falling back to "everything" for anything unknown. */
export function parseSlipFilters(params: URLSearchParams): SlipFilters {
  const fee = params.get('fee') as FeeFilter;
  const payment = String(params.get('payment') || 'all').toUpperCase();
  return {
    fee: FEE_FILTERS.includes(fee) ? fee : 'all',
    payment: (PAYMENT_FILTERS as readonly string[]).includes(payment) ? (payment as PaymentFilter) : 'all',
    q: String(params.get('q') || '').slice(0, 60),
  };
}
