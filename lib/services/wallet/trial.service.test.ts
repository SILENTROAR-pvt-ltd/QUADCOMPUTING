// The free month: once per venue, M¹-Pro or M²-Pro only, never on top of a paid plan, and it waives the ₹3 bill fee
// while it runs. Sign-up picks it by venue type: a café starts on M²-Pro's free month, a venue with rooms on Rhodium.
import { describe, expect, it } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { startTrial } from './trial.service';
import { planState } from './subscription-state';
import { defaultStartPlan } from './start-plan';

const V = 'venue-1';
const NOW = Date.parse('2026-10-24T10:00:00Z');
const DAY = 86_400_000;
const row = (extra: Record<string, unknown> = {}) => ({ id: 's1', venue_id: V, plan_tier: 'pay_as_you_go', status: 'active', trial_ends_at: null, expires_at: null, trial_used_at: null, ...extra });

describe('the free month', () => {
  it('starts M²-Pro for 30 days with no bill fee, and only once', async () => {
    const db = createFakeSupabase({ venue_subscriptions: [row()] });
    const res = await startTrial(db, V, 'm2_pro', NOW);
    expect(res).toEqual({ ok: true, plan: 'm2_pro', endsAt: new Date(NOW + 30 * DAY).toISOString() });
    const sub = db.tables.venue_subscriptions[0];
    expect(sub).toMatchObject({ plan_tier: 'm2_pro', status: 'trial', trial_used_at: new Date(NOW).toISOString() });
    expect(planState(sub, NOW + DAY)).toMatchObject({ onTrial: true, feesWaived: true });
    expect(await startTrial(db, V, 'm1_pro', NOW + DAY)).toMatchObject({ ok: false, status: 409 });
  });

  it('is not offered on Rhodium, and never replaces a paid plan that is running', async () => {
    expect(await startTrial(createFakeSupabase({ venue_subscriptions: [row()] }), V, 'rhodium_annual', NOW)).toMatchObject({ ok: false, status: 400 });
    const paid = createFakeSupabase({ venue_subscriptions: [row({ plan_tier: 'rhodium_annual', expires_at: new Date(NOW + 100 * DAY).toISOString() })] });
    expect(await startTrial(paid, V, 'm2_pro', NOW)).toMatchObject({ ok: false, status: 409 });
    expect(paid.tables.venue_subscriptions[0].plan_tier).toBe('rhodium_annual');
  });

  it('waits for the plans migration instead of failing oddly', async () => {
    const old = createFakeSupabase({ venue_subscriptions: [{ id: 's1', venue_id: V, plan_tier: 'pay_as_you_go', status: 'active' }] });
    expect(await startTrial(old, V, 'm2_pro', NOW)).toMatchObject({ ok: false, status: 503 });
  });

  it('starts a café on M²-Pro’s free month and a venue with rooms on Rhodium per bill', () => {
    expect(defaultStartPlan(['cafe'])).toBe('m2_pro');
    expect(defaultStartPlan(['homestay'])).toBe('rhodium_ppb');
    expect(defaultStartPlan(['cafe', 'hotel'])).toBe('rhodium_ppb');
  });
});
