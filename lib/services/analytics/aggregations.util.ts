// Turns a period's orders and stock usage into the analytics figures. Revenue is settled bills only (the same
// rule as the Z-report); open bills are counted apart, and cancelled orders are left out entirely.
import { bucketKey, bucketLabel, type Grain, type TrendEntry } from './trends-builder.util';

export interface ItemSales { id: string; name: string; sold_count: number; revenue: number }

const num = (v: unknown) => Number(v) || 0;
const lower = (v: unknown) => String(v ?? '').trim().toLowerCase();

function bucket(map: Record<string, TrendEntry>, at: unknown, grain: Grain): TrendEntry | null {
  const date = new Date(String(at ?? ''));
  if (Number.isNaN(date.getTime())) return null;
  const key = bucketKey(date, grain);
  if (!map[key]) map[key] = { revenue: 0, expenses: 0, orders: 0, label: bucketLabel(key, grain), timestamp: date.toISOString() };
  return map[key];
}

export function aggregateOrdersAndLogs(orders: any[], logs: any[], grain: Grain, trends: Record<string, TrendEntry>) {
  let gross_revenue = 0, actual_cogs = 0, total_discounts_given = 0, total_gst_collected = 0;
  let settled_bills = 0, open_bills = 0, open_value = 0;
  const payment_breakdown = { upi: 0, cash: 0, card: 0, other: 0 };
  const items = new Map<string, ItemSales>();
  const guests = new Set<string>();

  for (const order of orders) {
    const status = lower(order.status);
    if (status === 'cancelled') continue;

    const name = String(order.customer_name ?? '').trim();
    const guestKey = order.customer_phone || (name && !/^guest\b/i.test(name) ? lower(name) : '');
    if (guestKey) guests.add(String(guestKey));

    const total = num(order.grand_total);
    if (status !== 'settled') { open_bills += 1; open_value += total; continue; }

    settled_bills += 1;
    gross_revenue += total;
    total_discounts_given += num(order.discount_amount);
    total_gst_collected += num(order.tax_amount);

    const method = String(order.payment_method ?? '').toUpperCase();
    if (method === 'UPI') payment_breakdown.upi += total;
    else if (method === 'CASH') payment_breakdown.cash += total;
    else if (method === 'CARD') payment_breakdown.card += total;
    else payment_breakdown.other += total;

    const b = bucket(trends, order.created_at, grain);
    if (b) { b.revenue += total; b.orders += 1; }

    // One row per dish: lines from different bills share a name, not a line id.
    for (const item of Array.isArray(order.items) ? order.items : []) {
      if (item?.id === 'custom') continue;
      const itemName = String(item?.name ?? item?.item_name ?? '').trim();
      if (!itemName) continue;
      const key = itemName.toLowerCase();
      const unit = num(item.price?.amountMinor ?? item.nightlyRate?.amountMinor ?? item.price ?? item.unitPrice ?? item.unit_price);
      const qty = num(item.quantity ?? item.qty) || 1;
      const row = items.get(key) ?? { id: key, name: itemName, sold_count: 0, revenue: 0 };
      row.sold_count += qty;
      row.revenue += unit * qty;
      items.set(key, row);
    }
  }

  for (const log of logs) {
    const cost = num(log.total_cost);
    actual_cogs += cost;
    const b = bucket(trends, log.logged_at, grain);
    if (b) b.expenses += cost;
  }

  const best_selling = Array.from(items.values()).sort((a, b) => b.revenue - a.revenue || b.sold_count - a.sold_count);
  return {
    gross_revenue, actual_cogs, total_discounts_given, total_gst_collected, payment_breakdown, best_selling,
    settled_bills, open_bills, open_value, unique_guests: guests.size,
  };
}
