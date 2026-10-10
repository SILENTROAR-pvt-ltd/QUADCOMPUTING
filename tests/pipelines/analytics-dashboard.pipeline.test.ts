import { describe, it, expect } from 'vitest';
import { buildInitialTrendsMap, bucketKey, grainFor } from '@/lib/services/analytics/trends-builder.util';
import { aggregateOrdersAndLogs } from '@/lib/services/analytics/aggregations.util';
import { axisTicks, compactInr, niceCeil } from '@/components/host/workspaces/dashboard/chart-scale';

const DAY_START = '2026-10-07T18:30:00.000Z'; // 8 Oct 00:00 IST
const DAY_END = '2026-10-08T18:29:59.999Z';

describe('Analytics buckets follow the business day (India time)', () => {
  it('puts an order at 00:15 IST into midnight of the next day, not the server clock', () => {
    const at = new Date('2026-10-08T18:45:00Z');
    expect(bucketKey(at, 'hour')).toBe('00:00');
    expect(bucketKey(at, 'day')).toBe('2026-10-09');
    expect(bucketKey(at, 'month')).toBe('2026-10');
  });

  it('lays out 24 hours for a day and 7 days for a week', () => {
    expect(Object.keys(buildInitialTrendsMap('daily', DAY_START, DAY_END))).toHaveLength(24);
    const week = buildInitialTrendsMap('weekly', '2026-10-01T18:30:00.000Z', DAY_END);
    expect(Object.keys(week)).toEqual(['2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08']);
    expect(grainFor('custom', DAY_START, DAY_END)).toBe('hour');
  });
});

describe('Analytics figures', () => {
  const line = (price: number, qty: number) => ({ id: `line-${Math.random()}`, name: 'Misal Pav', price, qty });
  const orders = [
    { id: 'o1', status: 'settled', grand_total: 210, tax_amount: 10, payment_method: 'UPI', customer_phone: '9876543210', created_at: '2026-10-08T07:00:00Z', items: [line(200, 1)] },
    { id: 'o2', status: 'settled', grand_total: 420, tax_amount: 20, payment_method: 'SPLIT', customer_name: 'Asha', created_at: '2026-10-08T07:30:00Z', items: [line(200, 2)] },
    { id: 'o3', status: 'open', grand_total: 200, customer_name: 'Guest', created_at: '2026-10-08T08:00:00Z', items: [line(200, 1)] },
    { id: 'o4', status: 'cancelled', grand_total: 999, created_at: '2026-10-08T08:00:00Z', items: [line(999, 1)] },
  ];

  it('counts settled bills as sales, keeps open bills apart, and leaves cancelled orders out', () => {
    const trends = buildInitialTrendsMap('daily', DAY_START, DAY_END);
    const agg = aggregateOrdersAndLogs(orders, [{ total_cost: 50, logged_at: '2026-10-08T07:10:00Z' }], 'hour', trends);
    expect(agg).toMatchObject({ gross_revenue: 630, settled_bills: 2, open_bills: 1, open_value: 200, total_gst_collected: 30, actual_cogs: 50 });
    expect(agg.payment_breakdown).toEqual({ upi: 210, cash: 0, card: 0, other: 420 });
    expect(agg.unique_guests).toBe(2);
    expect(trends['12:00']).toMatchObject({ revenue: 210, orders: 1, expenses: 50 });
  });

  it('shows one row per dish across bills, not one per bill line', () => {
    const agg = aggregateOrdersAndLogs(orders, [], 'hour', buildInitialTrendsMap('daily', DAY_START, DAY_END));
    expect(agg.best_selling).toEqual([{ id: 'misal pav', name: 'Misal Pav', sold_count: 3, revenue: 600 }]);
  });
});

describe('Chart axis', () => {
  it('rounds the top of the axis to a readable value', () => {
    expect(niceCeil(630)).toBe(1000);
    expect(niceCeil(210)).toBe(250);
    expect(niceCeil(0)).toBe(100);
    expect(axisTicks(630)).toEqual([0, 250, 500, 750, 1000]);
  });

  it('writes short rupee labels', () => {
    expect(compactInr(950)).toBe('₹950');
    expect(compactInr(1250)).toBe('₹1.3k');
    expect(compactInr(340000)).toBe('₹3.4L');
    expect(compactInr(11000000)).toBe('₹1.1Cr');
  });
});
