// The QC² plan catalogue: the app's copy (plans.ts) and the database's copy (subscription_plans, which the approval
// function charges) must never disagree, and a plan's price is what the published pricing says.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cheapestPlanFor, isPerBill, PER_BILL_PLAN, planById, planCharge, PLANS, purchasablePlan, purchaseName, topupSetupDue, VIBEY_ADDON } from './plans';

const sql = readFileSync(join(process.cwd(), 'supabase/migrations/20261024000001_qc2_subscription_plans.sql'), 'utf8');
/** ('m1_pro', 'QC² M¹-Pro', 8999, 12, 30, 599, 0, true, 'plan') rows from the seed. */
const seeded = Array.from(sql.matchAll(/\('(\w+)', '[^']+', (\d+), (\d+), (\d+), (\d+), (\d+), (true|false), '(plan|addon)'\)/g))
  .map(([, id, price, term, trial, setup, perBill, purchasable, kind]) => ({ id, price: +price, term: +term, trial: +trial, setup: +setup, perBill: +perBill, purchasable: purchasable === 'true', kind }));

describe('the plan catalogue', () => {
  it('matches the published prices', () => {
    expect(PLANS.map((p) => [p.id, p.price, p.trialDays, p.setupFee])).toEqual([
      ['m1_pro', 8999, 30, 599], ['m2_pro', 14999, 30, 599], ['rhodium_annual', 48999, 0, 599],
    ]);
    expect(PER_BILL_PLAN).toMatchObject({ name: 'You earn, we earn', perBillFee: 3, setupFee: 599 });
    expect(PLANS.some((p) => p.badge === 'Most popular')).toBe(false);
  });

  it('is the same in the app and in the price table the database charges', () => {
    const app = [...PLANS, PER_BILL_PLAN].map((p) => ({
      id: p.id, price: p.price, term: p.termMonths, trial: p.trialDays, setup: p.setupFee, perBill: p.perBillFee, purchasable: p.id !== 'rhodium_ppb', kind: 'plan',
    }));
    const addon = { id: VIBEY_ADDON.id, price: VIBEY_ADDON.price, term: VIBEY_ADDON.termMonths, trial: 0, setup: 0, perBill: 0, purchasable: true, kind: 'addon' };
    expect(seeded).toEqual([...app, addon]);
  });

  it('sells Vibey on its own for ₹7,000 a year to M¹-Pro and M²-Pro venues', () => {
    expect(VIBEY_ADDON).toMatchObject({ price: 7000, termMonths: 12, forPlans: ['m1_pro', 'm2_pro'] });
    expect(purchaseName('vibey_addon')).toBe('Vibey AI add-on');
    expect(purchaseName('m2_pro')).toBe('QC² M²-Pro');
    expect(purchasablePlan('vibey_addon')).toBeNull();
  });

  it('sells only the current plans, while earlier tiers still read for old rows', () => {
    expect(purchasablePlan('m2_pro')?.price).toBe(14999);
    expect(purchasablePlan('12k_6m')).toBeNull();
    expect(planById('12k_6m')?.name).toBe('Growth');
    expect(purchasablePlan('rhodium_ppb')).toBeNull();
    expect(isPerBill('pay_as_you_go') && isPerBill('rhodium_ppb') && isPerBill(undefined)).toBe(true);
  });

  it('adds the ₹599 setup once per venue, on any plan', () => {
    const m1 = purchasablePlan('m1_pro')!;
    expect(planCharge(m1, null)).toEqual({ price: 8999, setup: 599, total: 9598 });
    expect(planCharge(m1, { setup_fee_paid_at: '2026-10-01T00:00:00Z' })).toEqual({ price: 8999, setup: 0, total: 8999 });
    expect(planCharge(purchasablePlan('m2_pro')!, null).total).toBe(15598);
    // Pay as you go takes it from the first top-up, once the column exists (before the migration nothing is owed).
    expect(topupSetupDue({ setup_fee_paid_at: null })).toBe(599);
    expect(topupSetupDue({ setup_fee_paid_at: '2026-10-01T00:00:00Z' })).toBe(0);
    expect(topupSetupDue({} as any)).toBe(0);
  });

  it('points each feature at the cheapest plan that has it (rooms only on Rhodium)', () => {
    expect(cheapestPlanFor('core').id).toBe('m1_pro');
    expect(cheapestPlanFor('delivery').id).toBe('m2_pro');
    expect(cheapestPlanFor('rooms').id).toBe('rhodium_annual');
    expect(cheapestPlanFor('vibey').id).toBe('rhodium_annual');
  });
});
