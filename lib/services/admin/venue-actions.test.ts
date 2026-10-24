// What a super admin may do to a venue, and exactly which subscription fields each action sets.
import { describe, expect, it } from 'vitest';
import { parseVenueAction, subscriptionPatch } from './venue-actions';

const NOW = Date.parse('2026-10-24T10:00:00Z');
const DAY = 86_400_000;
const iso = (d: number) => new Date(NOW + d * DAY).toISOString();

describe('super-admin venue actions', () => {
  it('accepts only well-formed actions', () => {
    expect(parseVenueAction({ action: 'set_plan', planTier: 'm2_pro', days: 365 })).toMatchObject({ ok: true });
    expect(parseVenueAction({ action: 'set_plan', planTier: 'free_forever' }).ok).toBe(false);
    expect(parseVenueAction({ action: 'start_trial', planTier: 'rhodium_annual' }).ok).toBe(false);
    expect(parseVenueAction({ action: 'start_trial', planTier: 'm1_pro', days: 120 }).ok).toBe(false);
    expect(parseVenueAction({ action: 'suspend' }).ok).toBe(false);
    expect(parseVenueAction({ action: 'suspend', reason: 'Unpaid dues for 3 months' })).toMatchObject({ ok: true });
    expect(parseVenueAction({ action: 'review', status: 'needs_docs', note: 'FSSAI missing' })).toMatchObject({ ok: true, value: { note: 'FSSAI missing' } });
    expect(parseVenueAction({ action: 'drop_table' }).ok).toBe(false);
  });

  it('gives a plan for N days, starts a free month, moves to ₹3 a bill', () => {
    expect(subscriptionPatch({ action: 'set_plan', planTier: 'rhodium_annual', days: 30 }, null, NOW)).toEqual({ patch: { plan_tier: 'rhodium_annual', status: 'active', trial_ends_at: null, expires_at: iso(30) } });
    expect(subscriptionPatch({ action: 'start_trial', planTier: 'm1_pro', days: 30 }, { trial_used_at: '2026-01-01T00:00:00Z' }, NOW))
      .toEqual({ patch: { plan_tier: 'm1_pro', status: 'trial', trial_ends_at: iso(30), expires_at: null, trial_used_at: '2026-01-01T00:00:00Z' } });
    expect(subscriptionPatch({ action: 'to_per_bill' }, {}, NOW)).toEqual({ patch: { plan_tier: 'pay_as_you_go', status: 'active', trial_ends_at: null, expires_at: null } });
  });

  it('extends a trial or a paid plan from its end (or from now if it already ended); nothing to extend on ₹3 a bill', () => {
    expect(subscriptionPatch({ action: 'extend', days: 10 }, { status: 'trial', trial_ends_at: iso(5) }, NOW)).toEqual({ patch: { trial_ends_at: iso(15) } });
    expect(subscriptionPatch({ action: 'extend', days: 10 }, { status: 'active', plan_tier: 'm2_pro', expires_at: iso(-3) }, NOW)).toEqual({ patch: { expires_at: iso(10) } });
    expect(subscriptionPatch({ action: 'extend', days: 10 }, { status: 'active', plan_tier: 'pay_as_you_go' }, NOW)).toHaveProperty('error');
  });

  it('suspends and resumes to the status the venue had (a running free month comes back as a trial)', () => {
    expect(subscriptionPatch({ action: 'suspend', reason: 'x' }, { status: 'active' }, NOW)).toEqual({ patch: { status: 'suspended' } });
    expect(subscriptionPatch({ action: 'suspend', reason: 'x' }, { status: 'suspended' }, NOW)).toHaveProperty('error');
    expect(subscriptionPatch({ action: 'resume' }, { status: 'suspended', trial_ends_at: iso(5), expires_at: null }, NOW)).toEqual({ patch: { status: 'trial' } });
    expect(subscriptionPatch({ action: 'resume' }, { status: 'suspended', expires_at: iso(100) }, NOW)).toEqual({ patch: { status: 'active' } });
    expect(subscriptionPatch({ action: 'resume' }, { status: 'active' }, NOW)).toHaveProperty('error');
  });

  it('stacks Vibey, waives the setup once', () => {
    expect(subscriptionPatch({ action: 'set_vibey', days: 365 }, { vibey_until: iso(10) }, NOW)).toEqual({ patch: { vibey_until: iso(375) } });
    expect(subscriptionPatch({ action: 'waive_setup' }, { setup_fee_paid_at: null }, NOW)).toEqual({ patch: { setup_fee_paid_at: new Date(NOW).toISOString() } });
    expect(subscriptionPatch({ action: 'waive_setup' }, { setup_fee_paid_at: iso(-30) }, NOW)).toHaveProperty('error');
  });
});
