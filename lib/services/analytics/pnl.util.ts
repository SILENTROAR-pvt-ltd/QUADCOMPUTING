/**
 * Profit and loss for a period, from what the venue records. Pure. Every figure is in rupees, rounded once to paise.
 *
 *   Revenue (excl. GST) = net sales + delivery fees + other charges
 *   Cost of goods       = ingredients used (recipe consumption at cost) + wastage + stock-count losses − count gains
 *   Gross profit        = revenue − cost of goods
 *   Operating expenses  = salaries paid + salary advances + bills & expenses (by category) + platform fees
 *   Net profit          = gross profit − operating expenses
 *
 * GST collected is owed to the government, so it is not revenue. Stock bought is cash spent on stock still on the
 * shelf; it becomes cost of goods only as recipes use it, so it is shown beside the statement, not inside it.
 */

export interface StockLog { action_type: string | null; change_amount: number | string | null; total_cost: number | string | null }
export interface ExpenseRow { category: string | null; custom_category_name?: string | null; amount: number | string; status?: string | null }
export interface PnlInput {
  net_sales: number; delivery_fees: number; other_charges: number; gst: number;
  logs: StockLog[];
  expenses: ExpenseRow[];
  salaries: Array<{ amount: number | string }>;
  advances: Array<{ amount: number | string }>;
  platform_fees: number;
  /** Data that could not be read; the statement says so instead of reporting a lower cost as fact. */
  missing?: string[];
}

export interface PnlLine { label: string; amount: number; note?: string }
export interface ProfitAndLoss {
  revenue: PnlLine[]; revenue_total: number;
  cogs: PnlLine[]; cogs_total: number;
  gross_profit: number; gross_margin: number | null;
  opex: PnlLine[]; opex_total: number;
  net_profit: number; net_margin: number | null;
  stock_purchased: number; gst_payable: number; pending_bills: number;
  has_recipe_costs: boolean;
  missing: string[];
}

const num = (v: unknown) => Number(v) || 0;
const r2 = (n: number) => Math.round(n * 100) / 100;
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null);

/** "Rent", "Electricity" … or the venue's own name for an "Other" expense. */
export function expenseLabel(e: ExpenseRow): string {
  const cat = String(e.category ?? '').trim();
  const custom = String(e.custom_category_name ?? '').trim();
  if ((!cat || /^other/i.test(cat)) && custom) return custom;
  return cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : 'Other';
}

export function buildProfitAndLoss(input: PnlInput): ProfitAndLoss {
  let used = 0, wasted = 0, countLoss = 0, countGain = 0, bought = 0;
  for (const l of input.logs) {
    const type = String(l.action_type ?? '').toUpperCase();
    const cost = Math.abs(num(l.total_cost));
    if (type === 'CONSUMPTION') used += cost;
    else if (type === 'WASTAGE') wasted += cost;
    else if (type === 'PURCHASE' || type === 'OPENING') bought += cost;
    else if (type === 'COUNT' || type === 'ADJUSTMENT' || type.startsWith('MANUAL_ADJUST')) {
      if (num(l.change_amount) < 0) countLoss += cost; else countGain += cost;
    }
  }

  const revenue: PnlLine[] = [
    { label: 'Net sales', amount: r2(input.net_sales), note: 'after discounts, before GST' },
    { label: 'Delivery fees', amount: r2(input.delivery_fees) },
    ...(input.other_charges ? [{ label: 'Other charges & rounding', amount: r2(input.other_charges) }] : []),
  ];
  const revenue_total = r2(revenue.reduce((a, l) => a + l.amount, 0));

  const cogs: PnlLine[] = [
    { label: 'Ingredients used', amount: r2(used), note: 'from recipes, at cost' },
    { label: 'Wastage', amount: r2(wasted) },
    { label: 'Stock count differences', amount: r2(countLoss - countGain), note: 'losses less gains' },
  ];
  const cogs_total = r2(cogs.reduce((a, l) => a + l.amount, 0));
  const gross_profit = r2(revenue_total - cogs_total);

  const byCategory = new Map<string, number>();
  let pending = 0;
  for (const e of input.expenses) {
    const label = expenseLabel(e);
    byCategory.set(label, (byCategory.get(label) ?? 0) + num(e.amount));
    if (String(e.status ?? '').toUpperCase() === 'PENDING') pending += num(e.amount);
  }
  const salaries = r2(input.salaries.reduce((a, s) => a + num(s.amount), 0));
  const advances = r2(input.advances.reduce((a, s) => a + num(s.amount), 0));
  const opex: PnlLine[] = [
    { label: 'Salaries paid', amount: salaries },
    { label: 'Salary advances', amount: advances },
    ...Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]).map(([label, amount]) => ({ label, amount: r2(amount) })),
    { label: 'Platform fees', amount: r2(input.platform_fees), note: '₹3 a settled bill' },
  ];
  const opex_total = r2(opex.reduce((a, l) => a + l.amount, 0));
  const net_profit = r2(gross_profit - opex_total);

  return {
    revenue, revenue_total, cogs, cogs_total, gross_profit, gross_margin: pct(gross_profit, revenue_total),
    opex, opex_total, net_profit, net_margin: pct(net_profit, revenue_total),
    stock_purchased: r2(bought), gst_payable: r2(input.gst), pending_bills: r2(pending),
    has_recipe_costs: used > 0, missing: input.missing ?? [],
  };
}
