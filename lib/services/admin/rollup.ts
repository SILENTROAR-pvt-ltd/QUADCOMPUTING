// Platform-wide rollups of settled bills, by India business day and venue. The database computes the same rows in
// admin_orders_daily (migration 20261024000003); these functions build them from raw orders when that function is not
// there yet, and shape them for the dashboard. Pure: no database access.
import { businessDateString, businessHour } from '@/lib/utils/business-day';

export interface DailyRow { day: string; venue_id: string; orders: number; gmv: number; subtotal: number; discount: number; tax: number; stay_gmv: number }
export interface OrderLike { created_at: string; business_id: string; grand_total?: unknown; subtotal?: unknown; discount_amount?: unknown; tax_amount?: unknown; order_type?: unknown }

const num = (v: unknown) => Number(v) || 0;
const round2 = (n: number) => Math.round(n * 100) / 100;
const STAY_TYPES = new Set(['room_stay', 'room_advance']);

/** One row per (IST day, venue) from settled orders. */
export function dailyFromOrders(orders: OrderLike[]): DailyRow[] {
  const map = new Map<string, DailyRow>();
  for (const o of orders) {
    const day = businessDateString(new Date(o.created_at));
    const key = `${day}|${o.business_id}`;
    const row = map.get(key) ?? { day, venue_id: o.business_id, orders: 0, gmv: 0, subtotal: 0, discount: 0, tax: 0, stay_gmv: 0 };
    row.orders += 1;
    row.gmv += num(o.grand_total);
    row.subtotal += num(o.subtotal);
    row.discount += num(o.discount_amount);
    row.tax += num(o.tax_amount);
    if (STAY_TYPES.has(String(o.order_type))) row.stay_gmv += num(o.grand_total);
    map.set(key, row);
  }
  return Array.from(map.values());
}

/** The last n IST dates ending today, oldest first. */
export function lastDays(n: number, now = Date.now()): string[] {
  return Array.from({ length: n }, (_, i) => businessDateString(now - (n - 1 - i) * 86_400_000));
}

export interface DayPoint { day: string; gmv: number; orders: number; stay: number; fnb: number }

/** A point for every day in `days` (zero where nothing was settled). */
export function seriesByDay(rows: DailyRow[], days: string[]): DayPoint[] {
  const by = new Map(days.map((d) => [d, { day: d, gmv: 0, orders: 0, stay: 0, fnb: 0 }]));
  for (const r of rows) {
    const p = by.get(r.day);
    if (!p) continue;
    p.gmv += r.gmv; p.orders += r.orders; p.stay += r.stay_gmv; p.fnb += r.gmv - r.stay_gmv;
  }
  return days.map((d) => { const p = by.get(d)!; return { ...p, gmv: round2(p.gmv), stay: round2(p.stay), fnb: round2(p.fnb) }; });
}

export interface Totals { gmv: number; orders: number; tax: number; stay: number; fnb: number; venues: number }

/** Totals over rows on or after `fromDay` (all rows when omitted), and how many venues settled a bill. */
export function totals(rows: DailyRow[], fromDay?: string): Totals {
  const pick = fromDay ? rows.filter((r) => r.day >= fromDay) : rows;
  const t = pick.reduce((a, r) => ({ gmv: a.gmv + r.gmv, orders: a.orders + r.orders, tax: a.tax + r.tax, stay: a.stay + r.stay_gmv }), { gmv: 0, orders: 0, tax: 0, stay: 0 });
  return { gmv: round2(t.gmv), orders: t.orders, tax: round2(t.tax), stay: round2(t.stay), fnb: round2(t.gmv - t.stay), venues: new Set(pick.map((r) => r.venue_id)).size };
}

export interface VenueTotals { venue_id: string; gmv: number; orders: number; tax: number; stay: number; lastDay: string | null }

/** Per venue, largest first. */
export function byVenue(rows: DailyRow[], fromDay?: string): VenueTotals[] {
  const map = new Map<string, VenueTotals>();
  for (const r of fromDay ? rows.filter((x) => x.day >= fromDay) : rows) {
    const v = map.get(r.venue_id) ?? { venue_id: r.venue_id, gmv: 0, orders: 0, tax: 0, stay: 0, lastDay: null };
    v.gmv += r.gmv; v.orders += r.orders; v.tax += r.tax; v.stay += r.stay_gmv;
    if (!v.lastDay || r.day > v.lastDay) v.lastDay = r.day;
    map.set(r.venue_id, v);
  }
  return Array.from(map.values()).map((v) => ({ ...v, gmv: round2(v.gmv), tax: round2(v.tax), stay: round2(v.stay) })).sort((a, b) => b.gmv - a.gmv);
}

/** 7 × 24 grid of settled bills: rows Monday..Sunday, columns 0..23 IST. */
export function heatmapFromOrders(orders: Array<{ created_at: string }>): number[][] {
  const grid = Array.from({ length: 7 }, () => Array(24).fill(0) as number[]);
  for (const o of orders) {
    const at = new Date(o.created_at);
    const dow = (new Date(at.getTime() + 5.5 * 3_600_000).getUTCDay() + 6) % 7;
    grid[dow][businessHour(at)] += 1;
  }
  return grid;
}

/** The same grid from the database rollup (isodow 1 = Monday). */
export function heatmapFromRows(rows: Array<{ dow: number; hour: number; orders: number }>): number[][] {
  const grid = Array.from({ length: 7 }, () => Array(24).fill(0) as number[]);
  for (const r of rows) if (r.dow >= 1 && r.dow <= 7 && r.hour >= 0 && r.hour < 24) grid[r.dow - 1][r.hour] += Number(r.orders) || 0;
  return grid;
}
