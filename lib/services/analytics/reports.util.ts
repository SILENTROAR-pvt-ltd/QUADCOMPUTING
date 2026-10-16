/**
 * The A-to-Z reports for one period, from its orders. Sales are settled bills only (the Z-report rule); open bills and
 * cancelled orders are reported apart. Every money figure is rounded to paise once, at the end of each sum.
 *
 *   gross sales  = Σ subtotal (dish prices before bill discounts)
 *   net sales    = gross sales − discounts
 *   collected    = Σ grand_total = net sales + GST + delivery fees (+ any other charge or rounding, shown when not zero)
 */
import { businessDateString, businessHour } from '@/lib/utils/business-day';
import { normaliseBill, salesBreakdown } from './z-report-sales.util';
import type { ZSalesLine } from './eod-z-report.types';
import { guestReportFromBills, type GuestReport } from './guests-report.util';

const num = (v: unknown) => Number(v) || 0;
const r2 = (n: number) => Math.round(n * 100) / 100;
const lower = (v: unknown) => String(v ?? '').trim().toLowerCase();

export interface ReportSummary {
  gross_sales: number; discounts: number; net_sales: number; gst: number; delivery_fees: number; other_charges: number;
  collected: number; settled_bills: number; avg_bill: number; items_sold: number;
  open_bills: number; open_value: number; cancelled_bills: number; cancelled_value: number;
}
export interface HourRow { hour: number; label: string; bills: number; sales: number }
export interface WeekdayRow { day: number; label: string; bills: number; sales: number }
export type ChannelId = 'dine_in' | 'delivery' | 'counter';
export interface ChannelRow { id: ChannelId; label: string; bills: number; sales: number }

export interface AnalyticsReports {
  summary: ReportSummary;
  by_hour: HourRow[];
  peak_hour: HourRow | null;
  by_weekday: WeekdayRow[];
  channels: ChannelRow[];
  categories: ZSalesLine[];
  items: ZSalesLine[];
  /** From the bills here; the analytics service replaces it with the My Guests ledger version when it can read it. */
  guests: GuestReport;
}

/** A dish's category from the menu catalogue, by its catalogue id or its name; null when the dish is not on the menu. */
export type CategoryOf = (name: string, itemId?: string | null) => string | null;

const HOUR_LABEL = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h >= 12 ? 'PM' : 'AM'}`;
// Monday first; JavaScript's getUTCDay() is Sunday = 0.
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const CHANNEL_LABEL: Record<ChannelId, string> = { dine_in: 'Dine-in', delivery: 'Delivery', counter: 'Counter / takeaway' };

export function channelOf(o: { is_delivery?: unknown; table_number?: unknown }): ChannelId {
  const table = String(o.table_number ?? '').trim();
  if (o.is_delivery === true || /^DLV-/i.test(table)) return 'delivery';
  if (!table || /^(takeaway|counter|pos)$/i.test(table)) return 'counter';
  return 'dine_in';
}

/** Who a bill belongs to, for repeat-guest counts: the phone's last 10 digits, else a real name. Null when unknown. */
export function guestKey(o: { customer_phone?: unknown; customer_name?: unknown }): string | null {
  const phone = String(o.customer_phone ?? '').replace(/\D/g, '');
  if (phone.length >= 10) return `p:${phone.slice(-10)}`;
  const name = lower(o.customer_name);
  return name && !/^guest\b/.test(name) && !/^walk-?in/.test(name) ? `n:${name}` : null;
}

export function buildReports(orders: any[], categoryOf: CategoryOf = () => null): AnalyticsReports {
  const settled: any[] = [];
  let open_bills = 0, open_value = 0, cancelled_bills = 0, cancelled_value = 0;
  for (const raw of orders) {
    const status = lower(raw.status);
    if (status === 'cancelled') { cancelled_bills += 1; cancelled_value += num(raw.grand_total); continue; }
    if (status !== 'settled') { open_bills += 1; open_value += num(raw.grand_total); continue; }
    settled.push(normaliseBill(raw));
  }

  let gross = 0, discounts = 0, gst = 0, delivery = 0, collected = 0, items_sold = 0;
  const hours: HourRow[] = Array.from({ length: 24 }, (_, h) => ({ hour: h, label: HOUR_LABEL(h), bills: 0, sales: 0 }));
  const weekdays: WeekdayRow[] = WEEKDAYS.map((label, day) => ({ day, label, bills: 0, sales: 0 }));
  const channels = new Map<ChannelId, ChannelRow>((['dine_in', 'delivery', 'counter'] as ChannelId[]).map((id) => [id, { id, label: CHANNEL_LABEL[id], bills: 0, sales: 0 }]));
  const guestBills: Array<{ id?: string; key: string | null; spend: number; created_at: string }> = [];

  for (const o of settled) {
    const total = num(o.grand_total);
    gross += num(o.subtotal); discounts += num(o.discount_amount); gst += num(o.tax_amount);
    delivery += num(o.delivery_fee); collected += total;
    for (const l of Array.isArray(o.items) ? o.items : []) items_sold += num(l?.qty ?? l?.quantity) || 1;

    const at = new Date(o.created_at);
    if (!Number.isNaN(at.getTime())) {
      const h = hours[businessHour(at)]; h.bills += 1; h.sales += total;
      const w = weekdays[(new Date(`${businessDateString(at)}T00:00:00Z`).getUTCDay() + 6) % 7]; w.bills += 1; w.sales += total;
    }
    const c = channels.get(channelOf(o))!; c.bills += 1; c.sales += total;
    guestBills.push({ id: o.id, key: guestKey(o), spend: total, created_at: o.created_at });
  }

  const net = gross - discounts;
  const other = collected - net - gst - delivery;
  const bills = settled.length;
  // A line saved with its own category keeps it; otherwise the menu catalogue says, by the line's item id or its name.
  const withCategories = settled.map((o) => ({
    ...o,
    items: (Array.isArray(o.items) ? o.items : []).map((l: any) => (l?.category ? l : { ...l, category: categoryOf(String(l?.name ?? l?.item_name ?? ''), l?.item_id ?? l?.id ?? null) || undefined })),
  }));
  const { items, categories } = salesBreakdown(withCategories, () => null, r2(net));
  const by_hour = hours.map((h) => ({ ...h, sales: r2(h.sales) }));
  const peak = by_hour.reduce<HourRow | null>((best, h) => (h.sales > 0 && (!best || h.sales > best.sales) ? h : best), null);

  return {
    summary: {
      gross_sales: r2(gross), discounts: r2(discounts), net_sales: r2(net), gst: r2(gst), delivery_fees: r2(delivery),
      other_charges: Math.abs(other) < 0.005 ? 0 : r2(other), collected: r2(collected), settled_bills: bills,
      avg_bill: bills ? r2(collected / bills) : 0, items_sold,
      open_bills, open_value: r2(open_value), cancelled_bills, cancelled_value: r2(cancelled_value),
    },
    by_hour,
    peak_hour: peak,
    by_weekday: weekdays.map((w) => ({ ...w, sales: r2(w.sales) })),
    channels: Array.from(channels.values()).map((c) => ({ ...c, sales: r2(c.sales) })),
    categories,
    items: items.slice(0, 10),
    guests: guestReportFromBills(guestBills),
  };
}
