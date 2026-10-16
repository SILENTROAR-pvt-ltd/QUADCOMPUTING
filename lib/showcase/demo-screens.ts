/**
 * The data behind each product screenshot, built from the fictional café's bills with the same pure builders the
 * live dashboard uses (reports, profit and loss, invoices, day slips), so every figure on the landing pages adds up.
 */
import { buildReports } from '@/lib/services/analytics/reports.util';
import { buildProfitAndLoss } from '@/lib/services/analytics/pnl.util';
import { buildInvoiceRows, feeReferenceFor } from '@/lib/services/wallet/invoice-history.util';
import { buildDaySlips } from '@/lib/services/wallet/day-slips.util';
import { PAYG_BILL_FEE } from '@/lib/services/wallet/plans';
import { DEMO_MENU, daysEnding, demoDayOrders } from './demo-orders';

/** The last billing day shown, and how many bills each day had (the last day is still open, until 8 PM). */
export const DEMO_TODAY = '2026-10-15';
const BILLS_PER_DAY = [48, 52, 61, 74, 83, 57, 50, 55, 49, 63, 70, 88, 92, 41];

const r2 = (n: number) => Math.round(n * 100) / 100;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayLabel = (day: string) => `${Number(day.slice(8))} ${MONTHS[Number(day.slice(5, 7)) - 1]}`;
const days = daysEnding(DEMO_TODAY, BILLS_PER_DAY.length);
const byDay = days.map((day, i) => ({ day, orders: demoDayOrders(day, BILLS_PER_DAY[i], 7_000 + i, i === days.length - 1 ? 20 : 22) }));
const all = byDay.flatMap((d) => d.orders);
const week = byDay.slice(-7).flatMap((d) => d.orders);
const previousWeek = byDay.slice(0, 7).flatMap((d) => d.orders);
const categoryOf = (name: string) => DEMO_MENU.find((m) => m.name === name)?.category ?? null;

/** The week's A-to-Z reports and its profit and loss. */
export const reports = buildReports(week, categoryOf);
const s = reports.summary;
const net = s.net_sales;
export const pnl = buildProfitAndLoss({
  net_sales: net, delivery_fees: s.delivery_fees, other_charges: s.other_charges, gst: s.gst,
  logs: [
    { action_type: 'CONSUMPTION', change_amount: -1, total_cost: r2(net * 0.31) },
    { action_type: 'WASTAGE', change_amount: -1, total_cost: r2(net * 0.012) },
    { action_type: 'COUNT', change_amount: -1, total_cost: 640 },
    { action_type: 'PURCHASE', change_amount: 1, total_cost: r2(net * 0.34) },
  ],
  expenses: [
    { category: 'rent', amount: 21_000 }, { category: 'electricity', amount: 6_400 }, { category: 'gas', amount: 3_150 },
    { category: 'marketing', amount: 2_500, status: 'PENDING' }, { category: 'maintenance', amount: 1_850 },
  ],
  salaries: [{ amount: 18_000 }, { amount: 15_500 }, { amount: 12_000 }, { amount: 9_000 }],
  advances: [{ amount: 3_000 }],
  platform_fees: s.settled_bills * PAYG_BILL_FEE,
});

const previous = previousWeek.reduce((a, o) => a + o.grand_total, 0);
const dishSales = new Map<string, { qty: number; revenue: number }>();
for (const o of week) for (const l of o.items) {
  const row = dishSales.get(l.name) ?? { qty: 0, revenue: 0 };
  row.qty += l.qty; row.revenue += l.price * l.qty;
  dishSales.set(l.name, row);
}

/** What the analytics endpoint would return for this week (the fields the dashboard cards read). */
export const analytics = {
  kpis: {
    net_sales: s.collected, settled_bills: s.settled_bills, avg_bill: s.avg_bill, open_bills: 3, open_value: 1_842,
    unique_guests: reports.guests.known, margin_pct: pnl.gross_margin, previous_net_sales: r2(previous),
    growth_pct: Math.round(((s.collected - previous) / previous) * 1000) / 10, grain: 'day' as const,
  },
  sales_overview: { gross_revenue: s.collected, gross_profit: pnl.gross_profit, revenue_growth: 0 },
  user_engagement: { total_orders_today: BILLS_PER_DAY[BILLS_PER_DAY.length - 1] },
  order_status: { total: s.settled_bills, completed: s.settled_bills, pending_kitchen: 2 },
  best_selling: Array.from(dishSales.entries()).sort((a, b) => b[1].revenue - a[1].revenue)
    .map(([name, v]) => ({ id: name, name, sold_count: v.qty, revenue: v.revenue })),
  active_promotions: [],
  critical_items: [
    { id: 'paneer', name: 'Paneer', current_stock: 0, unit: 'kg', reorder_level: 3 },
    { id: 'milk', name: 'Full-cream milk', current_stock: 4, unit: 'L', reorder_level: 12 },
    { id: 'beans', name: 'Coffee beans', current_stock: 0.9, unit: 'kg', reorder_level: 2.5 },
    { id: 'avocado', name: 'Avocado', current_stock: 7, unit: 'pcs', reorder_level: 10 },
    { id: 'basil', name: 'Basil', current_stock: 0.2, unit: 'kg', reorder_level: 0.25 },
  ],
  revenue_trends: [],
  payment_breakdown: { upi: 0, cash: 0, card: 0 },
  start_date: days[days.length - 7], end_date: DEMO_TODAY,
  total_discounts_given: s.discounts, total_gst_collected: s.gst, actual_cogs: pnl.cogs_total,
  reports, pnl, stock: { total: 46, out: 1 },
};

// Every bill carries the ₹3 fee: the last two days are still due, earlier days were cleared.
const dueFrom = days[days.length - 2];
const outstanding = all.map((o) => ({ reference_id: feeReferenceFor(o.id), amount: PAYG_BILL_FEE, status: o.created_at.slice(0, 10) >= dueFrom ? 'pending' : 'paid' }));
export const invoices = buildInvoiceRows(all, outstanding, []).reverse();
const dueRows = invoices.filter((i) => i.fee_status === 'due');

/** The Dues page: you earn against we earn, per-day bars, payment methods and today's slip. */
export const dues = {
  summary: { revenue: r2(all.reduce((a, o) => a + o.grand_total, 0)), invoiceCount: all.length, feesCharged: all.length * PAYG_BILL_FEE,
    feesDue: dueRows.length * PAYG_BILL_FEE, dueCount: dueRows.length, truncated: false },
  revenueBars: byDay.map((d) => ({ key: d.day, label: dayLabel(d.day), value: r2(d.orders.reduce((a, o) => a + o.grand_total, 0)) })),
  feeBars: byDay.map((d) => ({ key: d.day, label: dayLabel(d.day), value: d.orders.length * PAYG_BILL_FEE })),
  methods: (['UPI', 'CASH', 'CARD'] as const).map((method) => {
    const rows = all.filter((o) => o.payment_method === method);
    return { method, label: method === 'UPI' ? 'UPI' : method === 'CASH' ? 'Cash' : 'Card', amount: r2(rows.reduce((a, o) => a + o.grand_total, 0)), bills: rows.length };
  }),
  slip: buildDaySlips(invoices, { fee: 'all', payment: 'all', q: '' }).days[0],
};
