// Co-pilot tools over the analytics report and the dues ledger. Each one calls the service the dashboard already uses
// and returns its numbers as they are: the card is the answer, nothing is recomputed or rephrased by a model.
import { currentBillingDay, shiftDay } from '@/lib/services/wallet/billing-day';
import { fetchDaySlips } from '@/lib/services/wallet/day-slips.service';
import { fetchInvoiceSummary } from '@/lib/services/wallet/invoice-history.service';
import { fetchInvoiceDetail } from '@/lib/services/wallet/invoice-detail.service';
import { selectOrders } from '@/lib/services/wallet/order-number-column';
import { SETTLED_STATUSES } from '@/lib/utils/business-day';
import { count, money, scopeLine, TIMEFRAME_LABEL } from './format';
import type { HostCard, Timeframe, ToolArgs } from './schema';
import type { ToolContext, ToolResult } from './tools';

const tf = (a: ToolArgs): Timeframe => a.timeframe ?? 'daily';

export async function salesSummary(ctx: ToolContext, a: ToolArgs): Promise<ToolResult> {
  const r = await ctx.eod(tf(a));
  const k = r.kpis;
  const card: HostCard = {
    kind: 'kpis', title: 'Sales', scope: scopeLine(TIMEFRAME_LABEL[tf(a)], 'settled bills'), link: { tab: 'dashboard', label: 'Open Analytics' },
    items: [
      { label: 'Net sales', value: money(k.net_sales), format: 'money' },
      { label: 'Settled bills', value: count(k.settled_bills), format: 'count' },
      { label: 'Average bill', value: money(k.avg_bill), format: 'money' },
      { label: 'Open bills', value: count(k.open_bills), format: 'count' },
      { label: 'Open bill value', value: money(k.open_value), format: 'money' },
      { label: 'vs previous period', value: k.growth_pct ?? null, format: 'pct' },
    ],
  };
  return { cards: [card], facts: { net_sales: money(k.net_sales), bills: count(k.settled_bills), growth: k.growth_pct ?? null } };
}

export async function profitAndLoss(ctx: ToolContext, a: ToolArgs): Promise<ToolResult> {
  const p = (await ctx.eod(tf(a))).pnl;
  const cards: HostCard[] = [{
    kind: 'kpis', title: 'Profit & loss', scope: scopeLine(TIMEFRAME_LABEL[tf(a)], 'settled bills and recorded costs'), link: { tab: 'dashboard', label: 'Open Analytics' },
    items: [
      { label: 'Revenue', value: money(p.revenue_total), format: 'money' },
      { label: 'Cost of goods', value: money(p.cogs_total), format: 'money' },
      { label: 'Gross profit', value: money(p.gross_profit), format: 'money' },
      { label: 'Expenses', value: money(p.opex_total), format: 'money' },
      { label: 'Net profit', value: money(p.net_profit), format: 'money' },
      { label: 'Net margin', value: p.net_margin ?? null, format: 'pct' },
    ],
  }];
  if (p.missing?.length) cards.push({ kind: 'note', title: 'Not counted', text: `These could not be read, so they are left out: ${p.missing.join(', ')}.` });
  return { cards, facts: { net_profit: money(p.net_profit), revenue: money(p.revenue_total) } };
}

export async function topItems(ctx: ToolContext, a: ToolArgs): Promise<ToolResult> {
  const items = (await ctx.eod(tf(a))).reports.items.slice(0, a.limit ?? 5);
  return { cards: [{
    kind: 'rows', title: 'Top dishes', scope: scopeLine(TIMEFRAME_LABEL[tf(a)], 'by net sales'), link: { tab: 'dashboard', label: 'Open Analytics' },
    rows: items.map((i: any) => ({ label: String(i.name), value: money(i.net_sales), format: 'money' as const, sub: `${count(i.qty)} sold` })),
    empty: 'No settled sales in this period yet.',
  }] };
}

export async function guestsReport(ctx: ToolContext, a: ToolArgs): Promise<ToolResult> {
  const g = (await ctx.eod(tf(a))).reports.guests;
  return { cards: [
    { kind: 'kpis', title: 'Guests', scope: scopeLine(TIMEFRAME_LABEL[tf(a)], 'paid visits'), link: { tab: 'guests', label: 'Open My Guests' },
      items: [
        { label: 'Known guests', value: count(g.known), format: 'count' }, { label: 'Walk-ins', value: count(g.walk_ins), format: 'count' },
        { label: 'New', value: count(g.new_guests), format: 'count' }, { label: 'Returning', value: count(g.returning), format: 'count' },
        { label: 'Returning rate', value: g.returning_rate ?? null, format: 'pct' },
      ] },
    { kind: 'rows', title: 'Top guests', scope: scopeLine(TIMEFRAME_LABEL[tf(a)], 'by spend'), empty: 'No known guests in this period.',
      rows: (g.top || []).slice(0, 5).map((t: any) => ({ label: String(t.name), value: money(t.spend), format: 'money' as const, sub: `${count(t.visits)} visits` })) },
  ] };
}

export async function stockAlerts(ctx: ToolContext): Promise<ToolResult> {
  const items = (await ctx.eod('daily')).critical_items || [];
  return { cards: [{
    kind: 'rows', title: 'Running low', scope: scopeLine('Now', 'at or below reorder level'), link: { tab: 'inventory', label: 'Open Raw Inventory' },
    rows: items.slice(0, 10).map((i: any) => ({ label: String(i.name), value: `${Number(i.current_stock) || 0} ${i.unit || ''}`.trim(), format: 'text' as const, sub: `reorder at ${i.reorder_level}` })),
    empty: 'Nothing is below its reorder level.',
  }] };
}

export async function dues(ctx: ToolContext, a: ToolArgs): Promise<ToolResult> {
  const range = a.range ?? 'all';
  if (range === 'all') {
    const s = await fetchInvoiceSummary(ctx.admin, ctx.businessId);
    return { cards: [{ kind: 'kpis', title: 'Platform dues', scope: scopeLine('All time', 'platform fees'), link: { tab: 'payments', label: 'Open Dues' },
      items: [{ label: 'Due now', value: money(s.feesDue), format: 'money' }, { label: 'Bills with a fee due', value: count(s.dueCount), format: 'count' }, { label: 'Fees charged', value: money(s.feesCharged), format: 'money' }] }],
    facts: { due: money(s.feesDue) } };
  }
  const to = currentBillingDay();
  const from = range === 'today' ? to : shiftDay(to, -6);
  const { totals } = await fetchDaySlips(ctx.admin, ctx.businessId, { from, to }, { fee: 'all', payment: 'all', q: '' });
  return { cards: [{ kind: 'kpis', title: 'Dues', scope: scopeLine(range === 'today' ? 'Today' : 'Last 7 days', 'billing days, settled bills'), link: { tab: 'payments', label: 'Open Dues' },
    items: [{ label: 'Bills', value: count(totals.bills), format: 'count' }, { label: 'Revenue', value: money(totals.revenue), format: 'money' }, { label: 'Fees', value: money(totals.fees), format: 'money' }, { label: 'Fees due', value: money(totals.feesDue), format: 'money' }, { label: 'Fees paid', value: money(totals.feesPaid), format: 'money' }] }],
  facts: { due: money(totals.feesDue) } };
}

export async function findInvoice(ctx: ToolContext, a: ToolArgs): Promise<ToolResult> {
  const ref = a.orderNumber;
  if (!ref) return { cards: [{ kind: 'note', title: 'Which bill?', text: 'Tell me the order number (like ORD-012) or the invoice number.' }] };
  const { data, error } = await selectOrders('id, invoice_number, created_at', (columns) => {
    const q = ctx.admin.from('orders').select(columns).eq('business_id', ctx.businessId).in('status', [...SETTLED_STATUSES]);
    const byRef = columns.includes('order_number') && /^ORD-/.test(ref) ? q.eq('order_number', ref) : q.ilike('invoice_number', ref.replace(/[%_\\]/g, (c) => `\\${c}`));
    return byRef.order('created_at', { ascending: false }).limit(1);
  });
  if (error) throw error;
  const bill = data?.[0] ? await fetchInvoiceDetail(ctx.admin, ctx.businessId, data[0].id) : null;
  if (!bill) return { cards: [{ kind: 'note', title: 'Not found', text: `No settled bill ${ref} at this venue.`, link: { tab: 'payments', label: 'Open Dues' } }] };
  return { cards: [{
    kind: 'rows', title: `Bill ${bill.order_number || bill.invoice_number}`, scope: `${bill.place} · ${bill.payment_method || 'payment not recorded'} · ${new Date(bill.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
    link: { tab: 'payments', label: 'Open Dues' },
    rows: [
      ...bill.items.slice(0, 8).map((i) => ({ label: `${i.qty} × ${i.name}`, value: money(i.amount), format: 'money' as const })),
      { label: 'Tax', value: money(bill.tax), format: 'money' as const }, { label: 'Discount', value: money(bill.discount), format: 'money' as const },
      { label: 'Total', value: money(bill.total), format: 'money' as const }, { label: 'Platform fee', value: money(bill.fee), format: 'money' as const, sub: bill.fee_status },
    ],
  }] };
}
