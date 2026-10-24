// What a venue may use: its yearly plan or trial while in force, otherwise Rhodium Pro per bill (everything, ₹3 a
// bill). A venue is never locked out; a cheaper plan only leaves out the features it does not include.
import { describe, expect, it } from 'vitest';
import { canBuyVibeyAddon, canUse, entitlementsOf, featureBlock } from './entitlements';

const DAY = 86_400_000;
const iso = (days: number) => new Date(Date.now() + days * DAY).toISOString();

describe('entitlements', () => {
  it('a venue with no yearly plan is on Rhodium per bill: everything, at ₹3 a bill', () => {
    for (const sub of [null, { plan_tier: 'pay_as_you_go', status: 'active' }, { plan_tier: 'rhodium_ppb', status: 'active' }]) {
      const e = entitlementsOf(sub);
      expect(e.perBill).toBe(true);
      expect(e.plan.id).toBe('rhodium_ppb');
      expect(['core', 'events', 'delivery', 'rooms', 'vibey', 'viber_club'].every((f) => canUse(e, f as any))).toBe(true);
    }
  });

  it('M¹-Pro runs the cafe and kitchen, with no fee, but not events, delivery, rooms or Vibey', () => {
    const e = entitlementsOf({ plan_tier: 'm1_pro', status: 'active', expires_at: iso(200) });
    expect(e.perBill).toBe(false);
    expect(canUse(e, 'core')).toBe(true);
    for (const f of ['events', 'delivery', 'rooms', 'vibey'] as const) expect(canUse(e, f)).toBe(false);
    expect(featureBlock(e, 'delivery')).toMatchObject({ code: 'plan_required', plan: 'm2_pro' });
    expect(featureBlock(e, 'rooms')).toMatchObject({ plan: 'rhodium_annual' });
    expect(featureBlock(e, 'core')).toBeNull();
  });

  it('M²-Pro adds events and delivery; rooms stay a Rhodium feature', () => {
    const e = entitlementsOf({ plan_tier: 'm2_pro', status: 'trial', trial_ends_at: iso(20) });
    expect(e.state.onTrial).toBe(true);
    expect(e.perBill).toBe(false);
    expect(canUse(e, 'events') && canUse(e, 'delivery')).toBe(true);
    expect(canUse(e, 'rooms')).toBe(false);
  });

  it('an ended plan keeps its features for the grace week, then falls back to per bill, never to nothing', () => {
    const grace = entitlementsOf({ plan_tier: 'm1_pro', status: 'active', expires_at: iso(-1) });
    expect(grace.state).toMatchObject({ phase: 'grace', daysLeft: 6 });
    expect(grace.perBill).toBe(false);
    expect(canUse(grace, 'rooms')).toBe(false);
    const ended = entitlementsOf({ plan_tier: 'm1_pro', status: 'active', expires_at: iso(-8) });
    expect(ended.perBill).toBe(true);
    expect(canUse(ended, 'rooms')).toBe(true);
    // A trial has no grace week.
    expect(entitlementsOf({ plan_tier: 'm2_pro', status: 'trial', trial_ends_at: iso(-1) }).perBill).toBe(true);
  });

  it('the Vibey add-on unlocks Vibey on M¹-Pro or M²-Pro for its year, and only there', () => {
    const m1 = { plan_tier: 'm1_pro', status: 'active', expires_at: iso(200) };
    expect(canBuyVibeyAddon(entitlementsOf(m1))).toBe(true);
    expect(canBuyVibeyAddon(entitlementsOf({ plan_tier: 'm2_pro', status: 'trial', trial_ends_at: iso(20) }))).toBe(true);
    expect(featureBlock(entitlementsOf(m1), 'vibey')?.message).toMatch(/add Vibey for ₹7,000 a year/);
    const withAddon = entitlementsOf({ ...m1, vibey_until: iso(300) });
    expect(canUse(withAddon, 'vibey') && withAddon.vibeyUntil !== null).toBe(true);
    expect(canUse(withAddon, 'events')).toBe(false);
    expect(canUse(entitlementsOf({ ...m1, vibey_until: iso(-1) }), 'vibey')).toBe(false);
    // Rhodium (yearly or per bill) already has Vibey: nothing to add.
    expect(canBuyVibeyAddon(entitlementsOf({ plan_tier: 'rhodium_annual', status: 'active', expires_at: iso(200) }))).toBe(false);
    expect(canBuyVibeyAddon(entitlementsOf({ plan_tier: 'pay_as_you_go', status: 'active' }))).toBe(false);
  });

  it('an earlier yearly plan that is still running keeps everything it had', () => {
    const e = entitlementsOf({ plan_tier: '12k_6m', status: 'active', expires_at: iso(90) });
    expect(e.perBill).toBe(false);
    expect(canUse(e, 'rooms') && canUse(e, 'vibey')).toBe(true);
  });
});
