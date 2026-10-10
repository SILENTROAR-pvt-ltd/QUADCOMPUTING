import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { cleanOfferRequest } from '@/lib/services/offers/offer-request-input';
import { createOfferRequest, getOfferRequest } from '@/lib/services/offers/offer-requests';
import { settleOfferRequest } from '@/lib/services/offers/offer-requests-host';

const VENUE = 'aaaaaaaa-1111-4222-8333-444444444444';
const OTHER = 'bbbbbbbb-1111-4222-8333-444444444444';
const OFFER = 'cccccccc-1111-4222-8333-444444444444';
const FUTURE = new Date(Date.now() + 86_400_000).toISOString();
const PAST = new Date(Date.now() - 86_400_000).toISOString();

function seed(extra: Record<string, any> = {}) {
  return createFakeSupabase({
    venue_live_offers: [
      { id: OFFER, venue_id: VENUE, title: 'Quick Bites', discount_badge: '50% OFF', is_active: true, valid_until: FUTURE },
      { id: 'dddddddd-1111-4222-8333-444444444444', venue_id: VENUE, title: 'Old deal', discount_badge: '1+1 Free', is_active: true, valid_until: PAST },
      { id: 'eeeeeeee-1111-4222-8333-444444444444', venue_id: VENUE, title: 'Paused', discount_badge: 'Happy Hour', is_active: false, valid_until: null },
    ],
    venue_offer_requests: [],
    staff_notifications: [],
    ...extra,
  });
}

const redeem = (offerId = OFFER) => {
  const out = cleanOfferRequest({ offer_id: offerId, kind: 'redeem' });
  if (!out.ok) throw new Error(out.error);
  return out.value;
};

describe('Offer requests: redeeming and asking', () => {
  it('stores a redemption with a code and raises a host alert that carries the code', async () => {
    const db = seed();
    const out = await createOfferRequest(db, VENUE, redeem(), null);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.value.code).toMatch(/^[A-Z2-9]{6}$/);
    expect(db.tables.venue_offer_requests[0]).toMatchObject({ kind: 'redeem', code: out.value.code, status: 'open', offer_title: 'Quick Bites' });
    expect(db.tables.staff_notifications[0]).toMatchObject({ notification_type: 'OFFER_REDEEM', status: 'PENDING', business_id: VENUE });
    expect(db.tables.staff_notifications[0].message).toContain(out.value.code);
  });

  it('stores a question without a code and alerts the host with the text', async () => {
    const db = seed();
    const input = cleanOfferRequest({ offer_id: OFFER, kind: 'inquiry', message: 'Terrace too?' });
    if (!input.ok) throw new Error(input.error);
    const out = await createOfferRequest(db, VENUE, input.value, null);
    expect(out).toMatchObject({ ok: true, value: { code: null } });
    expect(db.tables.staff_notifications[0]).toMatchObject({ notification_type: 'OFFER_INQUIRY' });
    expect(db.tables.staff_notifications[0].message).toContain('Terrace too?');
  });

  it('refuses an offer that is paused, expired, or belongs to another venue', async () => {
    const db = seed();
    expect(await createOfferRequest(db, VENUE, redeem('dddddddd-1111-4222-8333-444444444444'), null)).toMatchObject({ ok: false, status: 404 });
    expect(await createOfferRequest(db, VENUE, redeem('eeeeeeee-1111-4222-8333-444444444444'), null)).toMatchObject({ ok: false, status: 404 });
    expect(await createOfferRequest(db, OTHER, redeem(), null)).toMatchObject({ ok: false, status: 404 });
    expect(db.tables.venue_offer_requests).toHaveLength(0);
  });
});

describe('Offer requests: the host settles them', () => {
  it('shows a guest their request only within its own venue', async () => {
    const db = seed();
    const made = await createOfferRequest(db, VENUE, redeem(), null);
    if (!made.ok) throw new Error(made.error);
    expect(await getOfferRequest(db, VENUE, made.value.id)).toMatchObject({ ok: true, value: { code: made.value.code, status: 'open' } });
    expect(await getOfferRequest(db, OTHER, made.value.id)).toMatchObject({ ok: false, status: 404 });
  });

  it('settles an open redemption once, and clears its alert', async () => {
    const db = seed();
    const made = await createOfferRequest(db, VENUE, redeem(), null);
    if (!made.ok) throw new Error(made.error);

    expect(await settleOfferRequest(db, OTHER, made.value.id, 'settled')).toMatchObject({ ok: false, status: 404 });
    expect(await settleOfferRequest(db, VENUE, made.value.id, 'settled')).toMatchObject({ ok: true });
    expect(db.tables.venue_offer_requests[0].status).toBe('settled');
    expect(db.tables.staff_notifications[0].status).toBe('RESOLVED');
    expect(await settleOfferRequest(db, VENUE, made.value.id, 'settled')).toMatchObject({ ok: false, status: 404 });
  });
});
