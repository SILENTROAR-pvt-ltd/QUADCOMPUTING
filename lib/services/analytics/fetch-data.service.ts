import { SETTLED_STATUSES } from '@/lib/utils/business-day';
import { adminDb } from '@/lib/supabase/admin';
import { guestReport, type GuestReport, type LedgerGuest, type LedgerVisit } from './guests-report.util';
import type { CategoryOf } from './reports.util';

const CHUNK = 150;
const chunks = <T,>(list: T[]) => Array.from({ length: Math.ceil(list.length / CHUNK) }, (_, i) => list.slice(i * CHUNK, (i + 1) * CHUNK));

/** Dish → category from the venue's menu catalogue, by catalogue id or by name. A failed read just means no categories. */
export async function fetchCatalogCategories(supabase: any, businessId: string): Promise<CategoryOf> {
  const { rows } = await readAllPages((from, to) => supabase.from('catalog_items').select('id, name, category')
    .eq('business_id', businessId).order('id').range(from, to));
  const byId = new Map<string, string>(), byName = new Map<string, string>();
  for (const r of rows) {
    const cat = String(r.category ?? '').trim();
    if (!cat) continue;
    if (r.id) byId.set(String(r.id), cat);
    if (r.name) byName.set(String(r.name).trim().toLowerCase(), cat);
  }
  return (name, itemId) => (itemId && byId.get(String(itemId))) || byName.get(name.trim().toLowerCase()) || null;
}

/**
 * Guests for these settled bills from the My Guests ledger, with every earlier visit of those guests (to tell new from
 * returning). The ledger is server-only (RLS with no policies), so it is read with the service role, scoped to this
 * venue and to bills the host's own query returned. Null when the ledger cannot be read; the report then uses the bills.
 */
export async function fetchLedgerGuests(businessId: string, settledOrderIds: string[], periodStartISO: string): Promise<GuestReport | null> {
  if (settledOrderIds.length === 0) return null;
  try {
    const db = adminDb();
    const period: LedgerVisit[] = [];
    for (const part of await Promise.all(chunks(settledOrderIds).map((ids) => db.from('ledger_visits')
      .select('order_id, guest_key, spend, visited_at').eq('business_id', businessId).in('order_id', ids)))) {
      if (part.error) return null;
      period.push(...(part.data ?? []));
    }
    if (period.length === 0) return null;
    const keys = Array.from(new Set(period.map((v) => v.guest_key).filter((k) => !k.startsWith('o:'))));
    const history: LedgerVisit[] = [];
    const guests: LedgerGuest[] = [];
    await Promise.all(chunks(keys).map(async (ks) => {
      const [h, g] = await Promise.all([
        db.from('ledger_visits').select('order_id, guest_key, spend, visited_at').eq('business_id', businessId).in('guest_key', ks).limit(10000),
        db.from('venue_guest_ledger').select('guest_key, guest_name, visits').eq('business_id', businessId).in('guest_key', ks),
      ]);
      history.push(...(h.data ?? []));
      guests.push(...(g.data ?? []));
    }));
    return guestReport(period, history, guests, periodStartISO);
  } catch (e) {
    console.warn('[analytics] guest ledger read failed; using the bills', e);
    return null;
  }
}

const PAGE = 1000;
/** A safety stop for one period: 100,000 bills. Beyond it the report says it was cut short. */
const MAX_ROWS = 100_000;

const ORDER_COLUMNS = 'id, items, status, order_type, subtotal, grand_total, discount_amount, tax_amount, payment_method, customer_name, customer_phone, created_at, table_number, is_delivery, delivery_fee';
// Before the delivery migration the two delivery columns do not exist; the period is then read without them.
const ORDER_COLUMNS_BASIC = 'id, items, status, order_type, subtotal, grand_total, discount_amount, tax_amount, payment_method, customer_name, customer_phone, created_at, table_number';

/**
 * Every row of a query, page by page. A single read stops at the database's row limit (1,000), which used to cut a
 * busy month short without saying so.
 */
export async function readAllPages(build: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: any }>) {
  const rows: any[] = [];
  for (let from = 0; rows.length < MAX_ROWS; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) return { rows, error, truncated: false };
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return { rows, error: null, truncated: false };
  }
  return { rows, error: null, truncated: true };
}

async function readOrders(supabase: any, businessId: string, startDate: string, endDate: string) {
  const read = (columns: string) => readAllPages((from, to) => supabase.from('orders').select(columns)
    .eq('business_id', businessId).gte('created_at', startDate).lte('created_at', endDate)
    .order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, to));
  const full = await read(ORDER_COLUMNS);
  if (!full.error) return full;
  if (/is_delivery|delivery_fee/.test(String(full.error?.message))) return read(ORDER_COLUMNS_BASIC);
  return full;
}

export async function fetchAnalyticsData(supabase: any, businessId: string, startDate: string, endDate: string) {
  const [orders, { data: tickets }, logs, { data: rawItems }, { data: rawPromos }] = await Promise.all([
    readOrders(supabase, businessId, startDate, endDate),
    supabase.from('kitchen_tickets').select('id, order_id, status')
      .eq('business_id', businessId).gte('created_at', startDate).lte('created_at', endDate),
    // Every stock movement of the period: consumption is cost of goods; wastage, counts and purchases feed the P&L.
    readAllPages((from, to) => supabase.from('inventory_logs').select('action_type, change_amount, total_cost, logged_at')
      .eq('business_id', businessId).gte('logged_at', startDate).lte('logged_at', endDate)
      .order('logged_at', { ascending: true }).range(from, to)),
    supabase.from('raw_inventory_items').select('id, item_name, current_stock, unit, threshold')
      .eq('business_id', businessId),
    supabase.from('promotions').select('id, title, discount_type, discount_value')
      .eq('business_id', businessId).eq('is_active', true).order('created_at', { ascending: false }),
  ]);

  return {
    orders: orders.rows, tickets: tickets || [],
    logs: logs.rows.filter((l: any) => String(l.action_type ?? '').toUpperCase() === 'CONSUMPTION'),
    stockLogs: logs.rows, stockLogsFailed: Boolean(logs.error),
    rawItems: rawItems || [], rawPromos: rawPromos || [],
    truncated: orders.truncated || logs.truncated,
  };
}

/**
 * The period's expenses for the P&L: bills by billing date, salaries by date paid, advances by date given (all IST dates),
 * and the platform fees recorded for the period's settled bills. Anything unreadable is named in `missing`.
 */
export async function fetchExpenseData(supabase: any, businessId: string, firstDay: string, lastDay: string, settledOrderIds: string[]) {
  const missing: string[] = [];
  const dated = (table: string, columns: string, dateCol: string) => readAllPages((from, to) => supabase.from(table).select(columns)
    .eq('business_id', businessId).gte(dateCol, firstDay).lte(dateCol, lastDay).order(dateCol, { ascending: true }).range(from, to));
  const [expenses, salaries, advances, platform_fees] = await Promise.all([
    dated('operational_expenses', 'category, custom_category_name, amount, status, billing_date', 'billing_date'),
    dated('staff_salary_payments', 'amount, paid_on', 'paid_on'),
    dated('staff_advances', 'amount, date_given', 'date_given'),
    fetchPlatformFees(businessId, settledOrderIds),
  ]);
  if (expenses.error) missing.push('bills & expenses');
  if (salaries.error) missing.push('salaries');
  if (advances.error) missing.push('salary advances');
  if (platform_fees === null) missing.push('platform fees');
  return { expenses: expenses.rows, salaries: salaries.rows, advances: advances.rows, platform_fees: platform_fees ?? 0, missing };
}

/** Platform fees recorded for these bills (`SETTLE_<order id>`), as dues or as deductions from credit. Null when unreadable. */
async function fetchPlatformFees(businessId: string, settledOrderIds: string[]): Promise<number | null> {
  if (settledOrderIds.length === 0) return 0;
  try {
    const db = adminDb();
    let total = 0;
    for (const ids of chunks(settledOrderIds)) {
      const refs = ids.map((id) => `SETTLE_${id}`);
      const [dues, ledger] = await Promise.all([
        db.from('venue_outstanding_bills').select('amount').eq('venue_id', businessId).in('reference_id', refs),
        db.from('usage_ledger').select('cost').eq('venue_id', businessId).eq('action_type', 'bill_generate').in('reference_id', refs),
      ]);
      if (dues.error) return null;
      total += (dues.data ?? []).reduce((a: number, r: any) => a + (Number(r.amount) || 0), 0);
      total += (ledger.data ?? []).reduce((a: number, r: any) => a + Math.max(0, Number(r.cost) || 0), 0);
    }
    return Math.round(total * 100) / 100;
  } catch {
    return null;
  }
}

/** Settled sales in the period of the same length just before this one, for the growth figure. */
export async function fetchPreviousNetSales(supabase: any, businessId: string, startDate: string, endDate: string): Promise<number> {
  const start = Date.parse(startDate);
  const length = Date.parse(endDate) - start + 1;
  if (!Number.isFinite(length) || length <= 0) return 0;
  const { rows, error } = await readAllPages((from, to) => supabase.from('orders').select('grand_total')
    .eq('business_id', businessId)
    .in('status', [...SETTLED_STATUSES])
    .gte('created_at', new Date(start - length).toISOString())
    .lt('created_at', new Date(start).toISOString())
    .order('created_at', { ascending: true }).range(from, to));
  if (error) return 0;
  return Math.round(rows.reduce((sum: number, o: any) => sum + (Number(o.grand_total) || 0), 0) * 100) / 100;
}
