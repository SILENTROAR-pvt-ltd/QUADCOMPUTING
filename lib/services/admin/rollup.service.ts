// Reads the platform rollups. The database functions (migration 20261024000003) do the work in SQL; until they are
// applied, settled orders are read directly (bounded) and rolled up here with the same rules.
import { readAllPages } from '@/lib/services/analytics/fetch-data.service';
import { SETTLED_STATUSES } from '@/lib/utils/business-day';
import { dailyFromOrders, heatmapFromOrders, heatmapFromRows, type DailyRow } from './rollup';

const MISSING_FUNCTION = new Set(['PGRST202', '42883']);
const num = (v: unknown) => Number(v) || 0;

export interface Rollup<T> { data: T; source: 'sql' | 'scan'; truncated: boolean }

export async function loadDaily(db: any, fromISO: string): Promise<Rollup<DailyRow[]>> {
  const { data, error } = await db.rpc('admin_orders_daily', { p_from: fromISO });
  if (!error) {
    const rows = (data || []).map((r: any) => ({
      day: String(r.day), venue_id: r.venue_id, orders: num(r.orders), gmv: num(r.gmv), subtotal: num(r.subtotal),
      discount: num(r.discount), tax: num(r.tax), stay_gmv: num(r.stay_gmv),
    }));
    return { data: rows, source: 'sql', truncated: false };
  }
  if (!MISSING_FUNCTION.has(error.code)) throw error;
  const read = await readAllPages((from, to) => db.from('orders')
    .select('created_at, business_id, grand_total, subtotal, discount_amount, tax_amount, order_type')
    .gte('created_at', fromISO).in('status', [...SETTLED_STATUSES]).order('created_at', { ascending: true }).range(from, to));
  if (read.error) throw read.error;
  return { data: dailyFromOrders(read.rows), source: 'scan', truncated: read.truncated };
}

export async function loadHeatmap(db: any, fromISO: string): Promise<Rollup<number[][]>> {
  const { data, error } = await db.rpc('admin_orders_heatmap', { p_from: fromISO });
  if (!error) return { data: heatmapFromRows(data || []), source: 'sql', truncated: false };
  if (!MISSING_FUNCTION.has(error.code)) throw error;
  const read = await readAllPages((from, to) => db.from('orders').select('created_at')
    .gte('created_at', fromISO).in('status', [...SETTLED_STATUSES]).order('created_at', { ascending: true }).range(from, to));
  if (read.error) throw read.error;
  return { data: heatmapFromOrders(read.rows), source: 'scan', truncated: read.truncated };
}
