// Sign-up starts the venue on the first month the host chose: a café on M²-Pro's free month by default, a venue with
// rooms on Rhodium per bill (rooms are a Rhodium feature), and a failed trial never undoes the venue.
import { describe, expect, it, vi } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';

const BIZ = 'bbbbbbbb-1111-4222-8333-444444444444';
const ctx = vi.hoisted(() => ({ db: null as any }));
vi.mock('@/lib/auth/guards', () => ({
  requireHost: async () => ({ error: null, user: { id: 'host-1', email: 'host@example.test' }, supabase: ctx.db }),
  adminDb: () => ctx.db,
}));
vi.mock('@/lib/supabase/admin', () => ({ adminDb: () => ctx.db }));
import { POST } from '@/app/api/host/provision/route';

const seed = () => {
  ctx.db = createFakeSupabase(
    { venue_subscriptions: [{ id: 's1', venue_id: BIZ, plan_tier: 'pay_as_you_go', status: 'active', trial_ends_at: null, expires_at: null, trial_used_at: null }] },
    { rpc: { provision_host_business: () => ({ success: true, business_id: BIZ, location_id: 'loc-1' }) } },
  );
};
const signUp = (extra: Record<string, unknown>) => POST(new Request('http://x/api/host/provision', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fullName: 'Test Host', email: 'host@example.test', password: 'long-enough-1', gender: 'other', dob: '1990-01-01',
    businesses: [{ businessName: 'Test Cafe', pincode: '175131', state: 'Himachal Pradesh', city: 'Manali', address: '12 Mall Road' }],
    ...extra,
  }),
}));

describe('the first month at sign-up', () => {
  it('starts a café on the free month of M²-Pro unless the host picks otherwise', async () => {
    seed();
    expect((await signUp({ categories: ['cafe'] })).status).toBe(200);
    expect(ctx.db.tables.venue_subscriptions[0]).toMatchObject({ plan_tier: 'm2_pro', status: 'trial' });

    seed();
    await signUp({ categories: ['cafe'], startPlan: 'm1_pro' });
    expect(ctx.db.tables.venue_subscriptions[0]).toMatchObject({ plan_tier: 'm1_pro', status: 'trial' });

    seed();
    await signUp({ categories: ['cafe'], startPlan: 'rhodium_ppb' });
    expect(ctx.db.tables.venue_subscriptions[0]).toMatchObject({ plan_tier: 'pay_as_you_go', trial_used_at: null });
  });

  it('starts a venue with rooms on Rhodium per bill', async () => {
    seed();
    expect((await signUp({ categories: ['homestay'] })).status).toBe(200);
    expect(ctx.db.tables.venue_subscriptions[0]).toMatchObject({ plan_tier: 'pay_as_you_go', trial_used_at: null });
  });

  it('still creates the venue when the trial cannot start', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    ctx.db = createFakeSupabase(
      { venue_subscriptions: [{ id: 's1', venue_id: BIZ, plan_tier: 'pay_as_you_go', status: 'active' }] },
      { rpc: { provision_host_business: () => ({ success: true, business_id: BIZ, location_id: 'loc-1' }) } },
    );
    const res = await signUp({ categories: ['cafe'] });
    expect(res.status).toBe(200);
    expect((await res.json()).businessId).toBe(BIZ);
  });
});
