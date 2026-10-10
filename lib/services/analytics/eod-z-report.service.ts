import type { SupabaseClient } from '@supabase/supabase-js';
import { adminDb } from '@/lib/supabase/admin';
import { businessDateString, businessDayRange, isDateOnly, SETTLED_STATUSES } from '@/lib/utils/business-day';
import type { EodZReport } from './eod-z-report.types';
import { buildZFigures } from './eod-z-report.util';

export const Z_MAX_RANGE_DAYS = 92;
export const Z_MAX_ORDERS = 5000;
const DAY_MS = 24 * 60 * 60 * 1000;

export class ZReportRangeError extends Error {}

/** IST calendar days from `date`, or `startDate`/`endDate`; today when neither is given. */
export function resolveZRange(url: string) {
  const p = new URL(url).searchParams;
  const today = businessDateString();
  const from = p.get('startDate') || p.get('date') || today;
  const to = p.get('endDate') || p.get('date') || today;
  if (!isDateOnly(from) || !isDateOnly(to) || from > to) throw new ZReportRangeError('Invalid date range. Use YYYY-MM-DD.');
  const start = businessDayRange(from).start;
  const end = businessDayRange(to).end;
  if (end.getTime() - start.getTime() > Z_MAX_RANGE_DAYS * DAY_MS) throw new ZReportRangeError(`Date range cannot exceed ${Z_MAX_RANGE_DAYS} days.`);
  return { from, to, start: start.toISOString(), end: end.toISOString() };
}

async function categoryLookup(supabase: SupabaseClient, businessId: string) {
  const { data, error } = await supabase.from('catalog_items').select('name, category').eq('business_id', businessId);
  if (error) console.warn('[z-report] catalog lookup failed', error.message);
  const map = new Map((data || []).map((r: any) => [String(r.name || '').trim().toLowerCase(), r.category ? String(r.category) : null]));
  return (name: string) => map.get(name.trim().toLowerCase()) || null;
}

async function walletRedeemedOn(orderIds: string[]): Promise<number> {
  if (orderIds.length === 0) return 0;
  const { data, error } = await adminDb().from('wallet_transactions')
    .select('amount').eq('transaction_type', 'REDEMPTION').in('order_id', orderIds);
  if (error) console.warn('[z-report] wallet lookup failed', error.message);
  return (data || []).reduce((a: number, r: any) => a + Math.abs(Number(r.amount) || 0), 0);
}

export async function computeEodZReport(
  supabase: SupabaseClient,
  business: { id: string; business_name?: string | null; name?: string | null; gst_number?: string | null },
  range: ReturnType<typeof resolveZRange>,
): Promise<EodZReport> {
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, created_at, subtotal, discount_amount, tax_amount, grand_total, payment_method, items, customer_name, customer_phone, guest_name, session_id')
    .eq('business_id', business.id)
    .gte('created_at', range.start)
    .lte('created_at', range.end)
    .order('created_at', { ascending: true })
    .limit(Z_MAX_ORDERS);
  if (error) throw error;

  const orders = (data || []) as any[];
  const settledIds = orders.filter((o) => (SETTLED_STATUSES as readonly string[]).includes(o.status)).map((o) => o.id);
  const [categoryOf, walletRedeemed] = await Promise.all([categoryLookup(supabase, business.id), walletRedeemedOn(settledIds)]);

  return {
    success: true,
    truncated: orders.length >= Z_MAX_ORDERS,
    generated_at: new Date().toISOString(),
    venue: { name: business.business_name || business.name || 'Venue', gstin: business.gst_number ? String(business.gst_number).toUpperCase() : null },
    period: range,
    ...buildZFigures(orders, walletRedeemed, categoryOf),
  };
}
