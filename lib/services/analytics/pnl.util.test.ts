import { describe, expect, it } from 'vitest';
import { buildProfitAndLoss, expenseLabel, type PnlInput } from './pnl.util';

const base: PnlInput = {
  net_sales: 10000, delivery_fees: 300, other_charges: 0, gst: 500,
  logs: [
    { action_type: 'CONSUMPTION', change_amount: -2, total_cost: 2500 },
    { action_type: 'CONSUMPTION', change_amount: -1, total_cost: 500 },
    { action_type: 'WASTAGE', change_amount: -1, total_cost: 200 },
    { action_type: 'COUNT', change_amount: -0.5, total_cost: 150 },
    { action_type: 'COUNT', change_amount: 0.2, total_cost: 50 },
    { action_type: 'PURCHASE', change_amount: 10, total_cost: 4000 },
    { action_type: 'OPENING', change_amount: 5, total_cost: 1000 },
  ],
  expenses: [
    { category: 'Rent', amount: 2000, status: 'PAID' },
    { category: 'Electricity', amount: 800, status: 'PENDING' },
    { category: 'Other', custom_category_name: 'Gas cylinder', amount: 400 },
  ],
  salaries: [{ amount: 1500 }],
  advances: [{ amount: 300 }],
  platform_fees: 66,
};

describe('buildProfitAndLoss', () => {
  const p = buildProfitAndLoss(base);

  it('takes revenue without GST', () => {
    expect(p.revenue_total).toBe(10300);
    expect(p.gst_payable).toBe(500);
  });

  it('counts ingredients used, wastage and net count losses as cost of goods, but not stock bought', () => {
    expect(p.cogs.map((l) => [l.label, l.amount])).toEqual([['Ingredients used', 3000], ['Wastage', 200], ['Stock count differences', 100]]);
    expect(p.cogs_total).toBe(3300);
    expect(p.stock_purchased).toBe(5000);
    expect(p.has_recipe_costs).toBe(true);
  });

  it('works out gross and net profit, and both margins', () => {
    expect(p.gross_profit).toBe(7000);
    expect(p.gross_margin).toBe(68);
    // 1500 + 300 + 2000 + 800 + 400 + 66
    expect(p.opex_total).toBe(5066);
    expect(p.net_profit).toBe(1934);
    expect(p.net_margin).toBe(18.8);
  });

  it('lists expenses by category, largest first, with the venue own name for Other, and notes pending bills', () => {
    expect(p.opex.map((l) => l.label)).toEqual(['Salaries paid', 'Salary advances', 'Rent', 'Electricity', 'Gas cylinder', 'Platform fees']);
    expect(p.pending_bills).toBe(800);
  });

  it('every section adds up to its total, and the statement balances', () => {
    const sum = (ls: { amount: number }[]) => Math.round(ls.reduce((a, l) => a + l.amount, 0) * 100) / 100;
    expect(sum(p.revenue)).toBe(p.revenue_total);
    expect(sum(p.cogs)).toBe(p.cogs_total);
    expect(sum(p.opex)).toBe(p.opex_total);
    expect(p.revenue_total - p.cogs_total - p.opex_total).toBe(p.net_profit);
  });

  it('shows the kitchen and the rooms apart when the venue has stays, and the revenue still adds up', () => {
    const p2 = buildProfitAndLoss({ ...base, rooms: { rooms: 7000, room_addons: 500, room_extras: 0 } });
    expect(p2.revenue.map((l) => [l.label, l.amount])).toEqual([['Food & drinks', 2500], ['Rooms & stays', 7000], ['Room add-ons', 500], ['Delivery fees', 300]]);
    expect(p2.revenue_total).toBe(10300);
    // No rooms sold: one net sales line, as before.
    expect(buildProfitAndLoss({ ...base, rooms: { rooms: 0, room_addons: 0, room_extras: 0 } }).revenue[0].label).toBe('Net sales');
  });

  it('reports a loss honestly and no margin when there is no revenue', () => {
    const empty = buildProfitAndLoss({ ...base, net_sales: 0, delivery_fees: 0, logs: [], salaries: [], advances: [], platform_fees: 0, expenses: [{ category: 'Rent', amount: 1000 }] });
    expect(empty.net_profit).toBe(-1000);
    expect(empty.net_margin).toBeNull();
    expect(empty.has_recipe_costs).toBe(false);
  });
});

describe('expenseLabel', () => {
  it('uses the category, or the custom name for Other', () => {
    expect(expenseLabel({ category: 'rent', amount: 1 })).toBe('Rent');
    expect(expenseLabel({ category: 'Other', custom_category_name: 'Pest control', amount: 1 })).toBe('Pest control');
    expect(expenseLabel({ category: 'Other', amount: 1 })).toBe('Other');
    expect(expenseLabel({ category: null, amount: 1 })).toBe('Other');
  });
});
