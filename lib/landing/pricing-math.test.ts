import { describe, expect, it } from 'vitest';
import { billsPerYear, priceFor, quote, type Usage } from './pricing-math';
import { PER_BILL_PLAN, PLANS, VIBEY_ADDON } from '@/lib/services/wallet/plans';

const usage = (over: Partial<Usage> = {}): Usage => ({ billsPerDay: 60, daysPerMonth: 30, avgBill: 600, needs: [], ...over });
const [m1, m2, rhodium] = PLANS;

describe('landing pricing maths', () => {
  it('counts a year of bills from a day and a month', () => {
    expect(billsPerYear({ billsPerDay: 60, daysPerMonth: 30 })).toBe(21600);
  });

  it('charges ₹3 a bill on You earn, we earn and a flat price on the yearly plans', () => {
    const r = priceFor(usage());
    expect(r.perBill.yearly).toBe(64800);
    expect(r.quotes.find((q) => q.plan === m1)?.yearly).toBe(m1.price);
    expect(r.best.plan).toBe(m1);
    expect(r.saving).toBe(64800 - m1.price);
  });

  it('keeps a low-volume venue on ₹3 a bill and names what a yearly plan would cost more', () => {
    const r = priceFor(usage({ billsPerDay: 5 }));
    expect(r.best.plan).toBe(PER_BILL_PLAN);
    expect(r.saving).toBe(m1.price - 5400);
  });

  it('only offers plans that cover the needs: rooms means Rhodium or ₹3 a bill', () => {
    const r = priceFor(usage({ needs: ['rooms'] }));
    expect(r.quotes.filter((q) => q.eligible).map((q) => q.plan)).toEqual([PER_BILL_PLAN, rhodium]);
    expect(r.quotes.find((q) => q.plan === m2)?.missing).toEqual(['rooms']);
    expect(r.best.plan).toBe(rhodium);
  });

  it('prices Vibey as the add-on on M¹ and M², and includes it on Rhodium', () => {
    const r = priceFor(usage({ needs: ['vibey'] }));
    expect(r.quotes.find((q) => q.plan === m1)).toMatchObject({ eligible: true, addon: VIBEY_ADDON.price, yearly: m1.price + VIBEY_ADDON.price });
    expect(r.quotes.find((q) => q.plan === rhodium)).toMatchObject({ addon: 0, yearly: rhodium.price });
  });

  it('works out where a yearly plan breaks even against ₹3 a bill', () => {
    expect(quote(m1, usage()).breakEvenPerDay).toBeCloseTo(m1.price / (3 * 30 * 12), 6);
    expect(quote(PER_BILL_PLAN, usage()).breakEvenPerDay).toBeNull();
  });

  it('shows the fee as a share of the average bill', () => {
    expect(priceFor(usage({ avgBill: 600 })).feeShare).toBeCloseTo(0.5, 6);
  });
});
