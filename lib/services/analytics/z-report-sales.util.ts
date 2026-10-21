import { businessHour } from '@/lib/utils/business-day';
import type { ZHour, ZSalesLine } from './eod-z-report.types';
import { STAY_CATEGORY, isAdvanceBill, staySegmentOf } from './stay-lines.util';

const num = (v: unknown) => Number(v) || 0;
export const round2 = (n: number) => Math.round(n * 100) / 100;

const qtyOf = (item: any) => num(item?.qty ?? item?.quantity) || 1;
const unitOf = (item: any) => num(item?.price ?? item?.unit_price ?? item?.unitPrice);

/**
 * Some bills were saved with a total but no breakdown (subtotal and tax 0). The
 * lines give the subtotal, and what the bill charged above net sales is the tax.
 */
export function normaliseBill<T extends Record<string, any>>(o: T): T {
  const lines: any[] = Array.isArray(o.items) ? o.items : [];
  const charged = num(o.grand_total);
  if (num(o.subtotal) > 0 || lines.length === 0 || charged <= 0) return o;
  const subtotal = round2(lines.reduce((a, l) => a + unitOf(l) * qtyOf(l), 0));
  const net = subtotal - num(o.discount_amount);
  const tax = num(o.tax_amount) || Math.max(0, round2(charged - net));
  return { ...o, subtotal, tax_amount: tax };
}

type Acc = Map<string, { name: string; qty: number; net: number }>;

function add(acc: Acc, name: string, qty: number, net: number) {
  const key = name.toLowerCase();
  const row = acc.get(key) || { name, qty: 0, net: 0 };
  row.qty += qty;
  row.net += net;
  acc.set(key, row);
}

function toLines(acc: Acc, netTotal: number): ZSalesLine[] {
  return Array.from(acc.values())
    .map((r) => ({ name: r.name, qty: r.qty, net_sales: round2(r.net), share: netTotal > 0 ? round2((r.net / netTotal) * 100) : 0 }))
    .sort((a, b) => b.net_sales - a.net_sales || b.qty - a.qty);
}

/** A line's category: its own, the stay segment it belongs to (rooms, add-ons, check-out fees), or the menu's. */
export function lineCategory(line: any, order: any, categoryOf: (name: string) => string | null): string {
  if (line?.category) return String(line.category);
  const stay = staySegmentOf(line);
  if (stay) return STAY_CATEGORY[stay];
  const menu = categoryOf(String(line?.name || 'Item').trim() || 'Item');
  if (menu) return menu;
  return isAdvanceBill(order?.order_type) ? STAY_CATEGORY.rooms : 'Uncategorised';
}

/**
 * Item and category sales from settled bills. A bill's discount is spread over its lines by value, so the lines add
 * up to net sales. A stay's advance and its credit on the final invoice both count as rooms, so a stay paid before
 * check-in is rooms revenue once, on the day it was paid.
 */
export function salesBreakdown(orders: any[], categoryOf: (name: string) => string | null, netTotal: number) {
  const items: Acc = new Map();
  const categories: Acc = new Map();
  for (const o of orders) {
    const lines: any[] = Array.isArray(o.items) ? o.items : [];
    const lineSum = lines.reduce((a, l) => a + unitOf(l) * qtyOf(l), 0);
    const net = num(o.subtotal) - num(o.discount_amount);
    for (const l of lines) {
      const name = String(l?.name || 'Item').trim() || 'Item';
      const share = lineSum > 0 ? ((unitOf(l) * qtyOf(l)) / lineSum) * net : 0;
      // The advance credit on a final invoice is not a thing sold: it adjusts the rooms figure, not the item list.
      if (unitOf(l) >= 0) add(items, name, qtyOf(l), share);
      add(categories, lineCategory(l, o, categoryOf), unitOf(l) >= 0 ? qtyOf(l) : 0, share);
    }
  }
  return { items: toLines(items, netTotal), categories: toLines(categories, netTotal) };
}

/** Bills and sales per IST hour, only for hours that had a bill. */
export function hourlySales(orders: any[], billTotal: (o: any) => number): ZHour[] {
  const byHour = new Map<number, ZHour>();
  for (const o of orders) {
    const at = new Date(o.created_at);
    if (Number.isNaN(at.getTime())) continue;
    const h = businessHour(at);
    const row = byHour.get(h) || { hour: `${String(h).padStart(2, '0')}:00`, bills: 0, sales: 0 };
    row.bills += 1;
    row.sales = round2(row.sales + billTotal(o));
    byHour.set(h, row);
  }
  return Array.from(byHour.entries()).sort((a, b) => a[0] - b[0]).map(([, r]) => r);
}
