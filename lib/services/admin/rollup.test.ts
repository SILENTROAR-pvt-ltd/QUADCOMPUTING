// The platform rollups must match what each venue's own reports say: settled bills, India business days, stays apart.
import { describe, expect, it } from 'vitest';
import { byVenue, dailyFromOrders, heatmapFromOrders, heatmapFromRows, lastDays, seriesByDay, totals } from './rollup';

const order = (created_at: string, business_id: string, grand_total: number, order_type = 'pos', tax = 0) =>
  ({ created_at, business_id, grand_total, subtotal: grand_total - tax, discount_amount: 0, tax_amount: tax, order_type });

describe('platform rollups', () => {
  it('buckets bills by India day (23:00 IST stays on that day; 00:30 IST is the next one)', () => {
    const rows = dailyFromOrders([
      order('2026-10-20T17:30:00Z', 'A', 100), // 23:00 IST, 20 Oct
      order('2026-10-20T19:00:00Z', 'A', 50), // 00:30 IST, 21 Oct
      order('2026-10-20T10:00:00Z', 'B', 2000, 'room_stay', 100),
    ]);
    expect(rows.find((r) => r.venue_id === 'A' && r.day === '2026-10-20')).toMatchObject({ orders: 1, gmv: 100 });
    expect(rows.find((r) => r.venue_id === 'A' && r.day === '2026-10-21')).toMatchObject({ orders: 1, gmv: 50 });
    expect(rows.find((r) => r.venue_id === 'B')).toMatchObject({ stay_gmv: 2000, tax: 100 });
  });

  it('fills every day of the window and splits F&B from stays', () => {
    const rows = dailyFromOrders([order('2026-10-20T08:00:00Z', 'A', 300), order('2026-10-20T09:00:00Z', 'B', 1200, 'room_advance')]);
    const s = seriesByDay(rows, ['2026-10-19', '2026-10-20']);
    expect(s).toEqual([
      { day: '2026-10-19', gmv: 0, orders: 0, stay: 0, fnb: 0 },
      { day: '2026-10-20', gmv: 1500, orders: 2, stay: 1200, fnb: 300 },
    ]);
  });

  it('totals, active venues and the leaderboard', () => {
    const rows = dailyFromOrders([order('2026-10-18T08:00:00Z', 'A', 100), order('2026-10-20T08:00:00Z', 'A', 100), order('2026-10-20T08:00:00Z', 'B', 500)]);
    expect(totals(rows, '2026-10-20')).toMatchObject({ gmv: 600, orders: 2, venues: 2 });
    expect(totals(rows)).toMatchObject({ gmv: 700, venues: 2 });
    expect(byVenue(rows).map((v) => [v.venue_id, v.gmv, v.lastDay])).toEqual([['B', 500, '2026-10-20'], ['A', 200, '2026-10-20']]);
  });

  it('peak hours by IST weekday and hour, the same from raw bills and from the database rollup', () => {
    // Monday 26 Oct 2026, 20:00 IST = 14:30 UTC.
    const grid = heatmapFromOrders([{ created_at: '2026-10-26T14:30:00Z' }, { created_at: '2026-10-26T14:45:00Z' }]);
    expect(grid[0][20]).toBe(2);
    expect(heatmapFromRows([{ dow: 1, hour: 20, orders: 2 }])[0][20]).toBe(2);
  });

  it('lists the last n India days, oldest first', () => {
    const d = lastDays(3, Date.parse('2026-10-24T20:00:00Z')); // 01:30 IST on 25 Oct
    expect(d).toEqual(['2026-10-23', '2026-10-24', '2026-10-25']);
  });
});
