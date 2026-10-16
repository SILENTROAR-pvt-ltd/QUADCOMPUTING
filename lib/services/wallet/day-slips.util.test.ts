import { describe, expect, it } from 'vitest';
import { buildDaySlips, parseSlipFilters, type SlipFilters } from './day-slips.util';
import type { InvoiceRow } from './invoice-history.util';

const ALL: SlipFilters = { fee: 'all', payment: 'all', q: '' };

let n = 0;
const row = (created_at: string, over: Partial<InvoiceRow> = {}): InvoiceRow => ({
  id: `id-${++n}`, invoice_number: `QC-2026-${String(n).padStart(8, '0')}`, created_at, where: 'T-01', guest: null,
  payment_method: 'UPI', grand_total: 100, fee: 3, fee_status: 'due', ...over,
});

// Times in UTC; IST is +05:30. 16 Oct 10 PM IST is 16:30 UTC.
const rows = [
  row('2026-10-16T06:00:00Z'), // 11:30 IST, 16 Oct
  row('2026-10-16T14:00:00Z', { payment_method: 'CASH', grand_total: 250, fee_status: 'cleared', guest: 'Alex' }), // 19:30 IST
  row('2026-10-16T17:00:00Z', { grand_total: 400 }), // 22:30 IST: rolls into 17 Oct, after hours
  row('2026-10-15T02:00:00Z', { fee: 0, fee_status: 'none', where: 'Delivery' }), // 07:30 IST, 15 Oct, after hours
];

describe('buildDaySlips', () => {
  it('makes one slip per billing day, newest first, rolling 10 PM bills into the next day', () => {
    const { days } = buildDaySlips(rows, ALL);
    expect(days.map((d) => [d.day, d.bills])).toEqual([['2026-10-17', 1], ['2026-10-16', 2], ['2026-10-15', 1]]);
  });

  it('totals each slip: revenue, fees, what is due and what is paid', () => {
    const day16 = buildDaySlips(rows, ALL).days.find((d) => d.day === '2026-10-16')!;
    expect(day16).toMatchObject({ bills: 2, revenue: 350, fees: 6, feesDue: 3, feesPaid: 3, afterHours: 0 });
  });

  it('marks bills outside 10 AM to 10 PM as after hours', () => {
    const { days, totals } = buildDaySlips(rows, ALL);
    expect(days[0].rows[0].after_hours).toBe(true);
    expect(totals.afterHours).toBe(2);
  });

  it('filters by fee status, payment method and search, and totals only what is shown', () => {
    expect(buildDaySlips(rows, { ...ALL, fee: 'due' }).totals.bills).toBe(2);
    expect(buildDaySlips(rows, { ...ALL, fee: 'paid' }).totals).toMatchObject({ bills: 1, revenue: 250 });
    expect(buildDaySlips(rows, { ...ALL, fee: 'none' }).totals.bills).toBe(1);
    expect(buildDaySlips(rows, { ...ALL, payment: 'CASH' }).totals.bills).toBe(1);
    expect(buildDaySlips(rows, { ...ALL, payment: 'OTHER' }).totals.bills).toBe(0);
    expect(buildDaySlips(rows, { ...ALL, q: 'alex' }).totals.revenue).toBe(250);
    expect(buildDaySlips(rows, { ...ALL, q: 'delivery' }).totals.bills).toBe(1);
  });
});

describe('parseSlipFilters', () => {
  it('reads known values and falls back to everything for the rest', () => {
    expect(parseSlipFilters(new URLSearchParams('fee=due&payment=cash&q=T-02'))).toEqual({ fee: 'due', payment: 'CASH', q: 'T-02' });
    expect(parseSlipFilters(new URLSearchParams('fee=bogus&payment=bitcoin'))).toEqual({ fee: 'all', payment: 'all', q: '' });
  });
});
