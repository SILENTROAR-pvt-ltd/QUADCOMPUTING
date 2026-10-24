// Phase 3 gating: each plan's routes refuse what the plan does not include (402 plan_required for the host, the
// feature simply absent for guests), only new intake is gated, and a venue is never locked out by a failed read.
import { describe, expect, it, vi } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';

const BIZ = 'bbbbbbbb-2222-4333-8444-555555555555';
const DAY = 86_400_000;
const ctx = vi.hoisted(() => ({ db: null as any, business: {} as Record<string, unknown> }));
vi.mock('@/lib/supabase/admin', () => ({ adminDb: () => ctx.db }));
vi.mock('@/lib/auth/guards', () => ({
  requireHost: async () => ({ error: null, businessId: BIZ, business: { id: BIZ, ...ctx.business }, supabase: ctx.db, user: { id: 'host-1' } }),
  adminDb: () => ctx.db,
}));
vi.mock('@/lib/auth/guest-validate', async () => {
  const actual: any = await vi.importActual('@/lib/auth/guest-validate');
  return { ...actual, validateGuestAccess: async () => ({ businessId: BIZ, tableNumber: 'T-1', error: null }) };
});
vi.mock('@/lib/middleware/rate-limiter', () => ({ enforceRateLimit: async () => null, checkRateLimit: async () => ({ allowed: true }), rateLimitResponse: () => null }));

import { POST as eventsPOST, PATCH as eventsPATCH } from '@/app/api/host/live-events/route';
import { GET as guestEventsGET } from '@/app/api/guest/events/route';
import { GET as deliveryInfoGET } from '@/app/api/guest/delivery-info/route';
import { PUT as deliveryPUT } from '@/app/api/host/delivery-settings/route';
import { POST as roomsPOST } from '@/app/api/host/accommodations/rooms/route';
import { POST as stayBookPOST } from '@/app/api/guest/stay/book/route';
import { GET as offersGET, POST as offersPOST } from '@/app/api/venue/offers/route';
import { GET as hostVibeyGET } from '@/app/api/host/vibey/route';
import { GET as planGET } from '@/app/api/host/plan/route';
import { GET as showcaseGET } from '@/app/api/guest/stay/showcase/route';
import { hasFeature } from '@/lib/services/billing/feature-gate';

const iso = (d: number) => new Date(Date.now() + d * DAY).toISOString();
const PLANS = {
  m1: { plan_tier: 'm1_pro', status: 'active', expires_at: iso(200) },
  m2: { plan_tier: 'm2_pro', status: 'active', expires_at: iso(200) },
  perBill: { plan_tier: 'pay_as_you_go', status: 'active' },
};
const EVENT_ID = 'cccccccc-1111-4222-8333-444444444444';
const seed = (sub: Record<string, unknown>, business: Record<string, unknown> = {}) => {
  ctx.business = business;
  ctx.db = createFakeSupabase({
    venue_subscriptions: [{ id: 's1', venue_id: BIZ, ...sub }],
    venue_live_events: [{ id: EVENT_ID, business_id: BIZ, title: 'Jazz night', status: 'LIVE', starts_at: iso(3) }],
    businesses: [{ id: BIZ, delivery_enabled: true, delivery_radius_km: 5, delivery_min_order: 300, delivery_fee: 40, delivery_lat: 32.24, delivery_lng: 77.19 }],
    venue_live_offers: [{ id: 'o1', venue_id: BIZ, title: 'Happy hour', is_active: true }],
  });
};
const req = (url: string, method = 'GET', body?: unknown) =>
  new Request(`http://x${url}`, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });

describe('plan gates', () => {
  it('M¹-Pro cannot publish events (402 naming M²-Pro) but can still cancel the ones it has', async () => {
    seed(PLANS.m1);
    const res = await eventsPOST(req('/api/host/live-events', 'POST', { title: 'Quiz night', starts_at: iso(5) }));
    expect(res.status).toBe(402);
    expect(await res.json()).toMatchObject({ success: false, code: 'plan_required', feature: 'events', plan: 'm2_pro' });
    expect((await eventsPATCH(req('/api/host/live-events', 'PATCH', { id: EVENT_ID, status: 'LIVE' }))).status).toBe(402);
    expect((await eventsPATCH(req('/api/host/live-events', 'PATCH', { id: EVENT_ID, status: 'CANCELLED' }))).status).toBe(200);

    seed(PLANS.m2);
    expect((await eventsPOST(req('/api/host/live-events', 'POST', { title: 'Quiz night', starts_at: iso(5) }))).status).toBe(201);
  });

  it('guests of an M¹-Pro venue see no events, no offers and no delivery', async () => {
    seed(PLANS.m1);
    expect((await (await guestEventsGET(req(`/api/guest/events?venue_id=${BIZ}`))).json()).events).toEqual([]);
    expect((await (await offersGET(req(`/api/venue/offers?venue_id=${BIZ}`))).json()).offers).toEqual([]);
    expect(await (await deliveryInfoGET(req(`/api/guest/delivery-info?cafe_id=${BIZ}`))).json()).toMatchObject({ enabled: false });

    seed(PLANS.perBill);
    expect(await (await deliveryInfoGET(req(`/api/guest/delivery-info?cafe_id=${BIZ}`))).json()).toMatchObject({ enabled: true });
    expect((await (await offersGET(req(`/api/venue/offers?venue_id=${BIZ}`))).json()).offers).toHaveLength(1);
  });

  it('turning delivery on or creating an offer needs M²-Pro; turning delivery off never does', async () => {
    seed(PLANS.m1);
    const terms = { radiusKm: 5, minOrder: 300, fee: 40, venueLat: 32.24, venueLng: 77.19 };
    expect((await deliveryPUT(req('/api/host/delivery-settings', 'PUT', { ...terms, enabled: true }))).status).toBe(402);
    expect((await deliveryPUT(req('/api/host/delivery-settings', 'PUT', { ...terms, enabled: false }))).status).toBe(200);
    expect((await offersPOST(req('/api/venue/offers', 'POST', { title: 'Two for one', discount_badge: '2x1' }))).status).toBe(402);
  });

  it('rooms are Rhodium only: M²-Pro adds no room, lists none to guests and takes no new stay booking', async () => {
    seed(PLANS.m2);
    const room = await roomsPOST(req('/api/host/accommodations/rooms', 'POST', { category_id: 'cat-1', room_number: '101' }));
    expect(room.status).toBe(402);
    expect(await room.json()).toMatchObject({ plan: 'rhodium_annual' });
    expect((await stayBookPOST(req('/api/guest/stay/book', 'POST', { venue: BIZ, category_id: 'cat-1' }))).status).toBe(402);
    ctx.db.tables.room_categories = [{ id: 'cat-1', business_id: BIZ, name: 'Deluxe', price: 3000, occupancy: 2 }];
    ctx.db.tables.rooms = [];
    const shown = await (await showcaseGET(req(`/api/guest/stay/showcase?venue=${BIZ}`))).json();
    expect(shown).toMatchObject({ success: true, types: [], venue: { id: BIZ, bookable: false } });

    seed(PLANS.perBill);
    ctx.db.tables.room_categories = [{ id: 'cat-1', business_id: BIZ, name: 'Deluxe', price: 3000, occupancy: 2 }];
    ctx.db.tables.rooms = [];
    const open = await (await showcaseGET(req(`/api/guest/stay/showcase?venue=${BIZ}`))).json();
    expect(open).toMatchObject({ types: [expect.objectContaining({ id: 'cat-1' })], venue: { bookable: true } });
  });

  it('Vibey is off on M¹-Pro and on with the add-on', async () => {
    seed(PLANS.m1, { vibey_host_enabled: true });
    expect(await (await hostVibeyGET(req('/api/host/vibey'))).json()).toMatchObject({ enabled: false, planRequired: true });
    seed({ ...PLANS.m1, vibey_until: iso(300) }, { vibey_host_enabled: true });
    expect(await (await hostVibeyGET(req('/api/host/vibey'))).json()).toMatchObject({ enabled: true, planRequired: false });
  });

  it('tells the dashboard the plan, its phase and what it unlocks', async () => {
    seed({ plan_tier: 'm2_pro', status: 'active', expires_at: iso(-2) });
    const plan = await (await planGET(req('/api/host/plan'))).json();
    expect(plan).toMatchObject({ plan: 'm2_pro', planName: 'QC² M²-Pro', phase: 'grace', perBill: false, vibeyUntil: null });
    expect(plan.features).toEqual(expect.arrayContaining(['core', 'events', 'delivery']));
    expect(plan.features).not.toContain('rooms');
  });

  it('opens everything when the plan cannot be read, so service never stops', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    ctx.db = createFakeSupabase({ venue_subscriptions: [{ id: 's1', venue_id: BIZ, ...PLANS.m1 }] }, { failOn: { 'venue_subscriptions.select': () => true } });
    expect(await hasFeature(BIZ, 'rooms')).toBe(true);
  });
});
