// Platform analytics over a window of 7, 30 or 90 days, against the window before it: GMV and bills per day (F&B vs
// stays), the venue leaderboard and the peak-hours heatmap. All from settled bills, India business days.
import { businessDayRange } from '@/lib/utils/business-day';
import { loadDaily, loadHeatmap } from './rollup.service';
import { byVenue, lastDays, seriesByDay, totals } from './rollup';
import { readAll } from './read-all';

export const WINDOWS = [7, 30, 90] as const;

export async function loadAnalytics(db: any, days: number, now = Date.now()) {
  const span = lastDays(days * 2, now);
  const current = span.slice(days);
  const previous = span.slice(0, days);
  const from = businessDayRange(span[0]).start.toISOString();
  const currentFrom = businessDayRange(current[0]).start.toISOString();
  const [daily, heat, biz, locs] = await Promise.all([
    loadDaily(db, from),
    loadHeatmap(db, currentFrom),
    readAll(db, 'businesses', 'id, business_name, name, categories'),
    readAll(db, 'locations', 'business_id, city'),
  ]);
  const rows = daily.data;
  const cur = totals(rows.filter((r) => r.day >= current[0]));
  const prev = totals(rows.filter((r) => r.day >= previous[0] && r.day < current[0]));
  const names = new Map<string, any>((biz.data || []).map((b: any) => [b.id, b]));
  const city = new Map<string, string>((locs.data || []).map((l: any) => [l.business_id, l.city]));
  const change = (a: number, b: number) => (b > 0 ? Math.round(((a - b) / b) * 1000) / 10 : null);

  return {
    days,
    source: daily.source,
    truncated: daily.truncated || heat.truncated,
    totals: cur,
    previous: prev,
    change: { gmv: change(cur.gmv, prev.gmv), orders: change(cur.orders, prev.orders) },
    averageBill: cur.orders ? Math.round((cur.gmv / cur.orders) * 100) / 100 : 0,
    series: seriesByDay(rows, current),
    leaderboard: byVenue(rows, current[0]).map((v) => ({
      ...v, name: names.get(v.venue_id)?.business_name || names.get(v.venue_id)?.name || 'Venue', city: city.get(v.venue_id) || null,
      avgBill: v.orders ? Math.round((v.gmv / v.orders) * 100) / 100 : 0,
    })),
    heatmap: heat.data,
  };
}
