import type { AnalyticsReports } from '@/lib/services/analytics/reports.util';
import type { ProfitAndLoss } from '@/lib/services/analytics/pnl.util';
import { csvCell as cell } from '@/lib/utils/csv';
const row = (...values: unknown[]) => values.map(cell).join(',');

/** The whole report as one CSV: summary, hours, weekdays, channels, categories and top dishes. Plain rupees, no symbols. */
export function reportCsv(r: AnalyticsReports, periodLabel: string, pnl?: ProfitAndLoss): string {
  const s = r.summary;
  const pl = pnl ? [
    row('Profit & loss', 'Amount (INR)'),
    ...pnl.revenue.map((l) => row(`Revenue: ${l.label}`, l.amount)), row('Revenue', pnl.revenue_total),
    ...pnl.cogs.map((l) => row(`Cost of goods: ${l.label}`, l.amount)), row('Cost of goods', pnl.cogs_total),
    row('Gross profit', pnl.gross_profit), row('Gross margin %', pnl.gross_margin ?? ''),
    ...pnl.opex.map((l) => row(`Expense: ${l.label}`, l.amount)), row('Operating expenses', pnl.opex_total),
    row('Net profit', pnl.net_profit), row('Net margin %', pnl.net_margin ?? ''),
    row('Stock bought (cash out)', pnl.stock_purchased), row('GST to pay', pnl.gst_payable), row('Bills still unpaid', pnl.pending_bills),
    '',
  ] : [];
  return [
    row('Report', periodLabel),
    '',
    ...pl,
    row('Summary', 'Amount (INR)'),
    row('Gross sales', s.gross_sales), row('Discounts', s.discounts), row('Net sales', s.net_sales), row('GST', s.gst),
    row('Delivery fees', s.delivery_fees), row('Other charges & rounding', s.other_charges), row('Total collected', s.collected),
    row('Settled bills', s.settled_bills), row('Average bill', s.avg_bill), row('Items sold', s.items_sold),
    row('Open bills', s.open_bills), row('Open value', s.open_value), row('Cancelled bills', s.cancelled_bills), row('Cancelled value', s.cancelled_value),
    '',
    row('Hour (IST)', 'Bills', 'Sales'), ...r.by_hour.map((h) => row(h.label, h.bills, h.sales)),
    '',
    row('Weekday', 'Bills', 'Sales'), ...r.by_weekday.map((w) => row(w.label, w.bills, w.sales)),
    '',
    row('Channel', 'Bills', 'Sales'), ...r.channels.map((c) => row(c.label, c.bills, c.sales)),
    '',
    row('Category', 'Qty', 'Net sales', 'Share %'), ...r.categories.map((c) => row(c.name, c.qty, c.net_sales, c.share)),
    '',
    row('Top dish', 'Qty', 'Net sales', 'Share %'), ...r.items.map((c) => row(c.name, c.qty, c.net_sales, c.share)),
    '',
    row('Guests', 'Count'), row('Connected guests', r.guests.known), row('Walk-ins', r.guests.walk_ins), row('New', r.guests.new_guests),
    row('Returning', r.guests.returning), row('Returning rate %', r.guests.returning_rate ?? ''),
    '',
    row('Top guest', 'Visits', 'Spend', 'All-time visits'), ...r.guests.top.map((t) => row(t.name, t.visits, t.spend, t.lifetime_visits)),
  ].join('\n');
}

export function downloadCsv(filename: string, csv: string) {
  // A byte-order mark so Excel reads the rupee names and any non-English dish names correctly.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
