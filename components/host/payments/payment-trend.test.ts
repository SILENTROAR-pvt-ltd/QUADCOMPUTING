import { describe, expect, it } from 'vitest';
import { trendFrom } from './usePaymentTrend';
import { compactRupees } from './chart-tokens';

const slip = (day: string, rows: Array<{ payment_method: string | null; grand_total: number }>, revenue: number, fees: number) => ({
  day, bills: rows.length, revenue, fees, feesDue: fees, feesPaid: 0, afterHours: 0,
  rows: rows.map((r, i) => ({ id: `${day}-${i}`, invoice_number: 'QC', created_at: `${day}T08:00:00Z`, where: 'T-01', guest: null, fee: 3, fee_status: 'due' as const, after_hours: false, ...r })),
});

describe('trendFrom', () => {
  it('fills every day of the range, empty days as zero, oldest first', () => {
    const { points } = trendFrom([slip('2026-10-16', [{ payment_method: 'UPI', grand_total: 500 }], 500, 3)], '2026-10-14', 3);
    expect(points.map((p) => [p.day, p.revenue, p.fees, p.bills])).toEqual([
      ['2026-10-14', 0, 0, 0], ['2026-10-15', 0, 0, 0], ['2026-10-16', 500, 3, 1],
    ]);
  });

  it('splits revenue by payment method, with anything unknown as Other', () => {
    const { methods } = trendFrom([
      slip('2026-10-15', [{ payment_method: 'UPI', grand_total: 100 }, { payment_method: 'CASH', grand_total: 250.5 }], 350.5, 6),
      slip('2026-10-16', [{ payment_method: 'UPI', grand_total: 40 }, { payment_method: null, grand_total: 60 }, { payment_method: 'SPLIT', grand_total: 10 }], 110, 9),
    ], '2026-10-15', 2);
    expect(methods.map((m) => [m.method, m.amount, m.bills])).toEqual([['UPI', 140, 2], ['CASH', 250.5, 1], ['CARD', 0, 0], ['OTHER', 70, 2]]);
  });
});

describe('compactRupees', () => {
  it('shortens amounts for axis ticks', () => {
    expect(compactRupees(980)).toBe('₹980');
    expect(compactRupees(1200)).toBe('₹1.2k');
    expect(compactRupees(45000)).toBe('₹45k');
    expect(compactRupees(130000)).toBe('₹1.3L');
  });
});
