import { describe, expect, it } from 'vitest';
import { analytics, dues, invoices, pnl, reports } from './demo-screens';
import { demoDayOrders } from './demo-orders';
import { PAYG_BILL_FEE } from '@/lib/services/wallet/plans';

const r2 = (n: number) => Math.round(n * 100) / 100;

describe('Landing-page sample data', () => {
  it('is the same every time (seeded)', () => {
    expect(demoDayOrders('2026-10-10', 20, 42)).toEqual(demoDayOrders('2026-10-10', 20, 42));
  });

  it('bills add up: net + GST + delivery fees = collected', () => {
    const s = reports.summary;
    expect(r2(s.net_sales + s.gst + s.delivery_fees + s.other_charges)).toBe(s.collected);
    expect(r2(s.gross_sales - s.discounts)).toBe(s.net_sales);
    expect(s.other_charges).toBe(0);
  });

  it('profit and loss adds up, and the KPI card shows the same net profit', () => {
    expect(r2(pnl.revenue_total - pnl.cogs_total)).toBe(pnl.gross_profit);
    expect(r2(pnl.gross_profit - pnl.opex_total)).toBe(pnl.net_profit);
    expect(analytics.pnl.net_profit).toBe(pnl.net_profit);
    expect(pnl.opex.find((l) => l.label === 'Platform fees')?.amount).toBe(reports.summary.settled_bills * PAYG_BILL_FEE);
  });

  it('dues charge ₹3 a bill and nothing else', () => {
    expect(dues.summary.invoiceCount).toBe(invoices.length);
    expect(dues.summary.feesCharged).toBe(invoices.length * PAYG_BILL_FEE);
    expect(invoices.every((i) => i.fee === PAYG_BILL_FEE)).toBe(true);
    expect(dues.summary.feesDue).toBe(invoices.filter((i) => i.fee_status === 'due').length * PAYG_BILL_FEE);
    expect(r2(dues.methods.reduce((a, m) => a + m.amount, 0))).toBe(dues.summary.revenue);
  });

  it('has a believable mix of guests: some new, some returning, walk-ins', () => {
    const g = reports.guests;
    expect(g.new_guests).toBeGreaterThan(0);
    expect(g.returning).toBeGreaterThan(0);
    expect(g.walk_ins).toBeGreaterThan(0);
  });
});
