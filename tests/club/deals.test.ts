import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({}) }));

import { moneyDb, CREATOR, OWNER, GUEST, EVENT, PROPERTY } from './money-setup';
import { actionError, agreementFor, parseTerms } from '@/lib/club/marketplace/offer-rules';
import { makeOffer, respondToOffer } from '@/lib/club/marketplace/offers.service';

const terms = { rate: 40000, guests: 12, check_in: '2030-01-10', check_out: '2030-01-12', add_ons: [{ label: 'Bonfire', amount: 2500 }] };

describe('Deal-flow rules', () => {
  const offer = { status: 'open' as const, creator_id: 'c', owner_id: 'o', last_actor: 'c' };

  it('parties take turns; outsiders and closed deals are refused', () => {
    expect(actionError(offer, 'c', 'accept')).toMatch(/Waiting/);
    expect(actionError(offer, 'o', 'accept')).toBeNull();
    expect(actionError(offer, 'o', 'counter')).toBeNull();
    expect(actionError(offer, 'x', 'accept')).toMatch(/not part/);
    expect(actionError({ ...offer, status: 'accepted' }, 'o', 'reject')).toMatch(/closed/);
  });

  it('only the creator withdraws, even out of turn', () => {
    expect(actionError(offer, 'c', 'withdraw')).toBeNull();
    expect(actionError(offer, 'o', 'withdraw')).toMatch(/Only the plan creator/);
  });

  it('terms are rupees in, paise out, and dates must be in order', () => {
    expect(parseTerms(terms)).toMatchObject({ ok: true, terms: { rate: 4_000_000, add_ons: [{ label: 'Bonfire', amount: 250_000 }] } });
    expect(parseTerms({ ...terms, rate: 0 })).toMatchObject({ ok: false });
    expect(parseTerms({ ...terms, check_out: '2030-01-09' })).toMatchObject({ ok: false });
  });

  it('the agreement itemises the stay and add-ons; the deposit is the configured share', () => {
    const a = agreementFor({ rate: 4_000_000, guests: 12, check_in: '2030-01-10', check_out: '2030-01-12', add_ons: [{ label: 'Bonfire', amount: 250_000 }] }, 1000);
    expect(a.total).toBe(4_250_000);
    expect(a.deposit).toBe(425_000);
    expect(a.items[0].label).toContain('12 guests, 2 nights');
    expect(a.invoiceNumber).toMatch(/^VCI-\d{8}-[A-Z0-9]{5}$/);
  });
});

describe('Negotiating with a property', () => {
  it('offer → counter → accept locks the rate into an agreement invoice', async () => {
    const { db, creator } = moneyDb();
    const offer = await makeOffer(db, creator, { event_id: EVENT, property_id: PROPERTY, ...terms, note: 'Group of 12' });
    const countered = await respondToOffer(db, OWNER, offer.id, { action: 'counter', version: 1, ...terms, rate: 45000 });
    expect(countered.offer).toMatchObject({ status: 'countered', rate: 4_500_000, version: 2, last_actor: OWNER });
    await expect(respondToOffer(db, OWNER, offer.id, { action: 'accept', version: 2 })).rejects.toMatchObject({ status: 409 });
    const accepted = await respondToOffer(db, CREATOR, offer.id, { action: 'accept', version: 2 });
    expect(accepted.agreement).toMatchObject({ total: 4_750_000, deposit_amount: 475_000, status: 'awaiting_deposit', owner_id: OWNER });
    expect(db.tables.club_offer_revisions.map((r: any) => r.action)).toEqual(['offer', 'counter', 'accept']);
  });

  it('a stale screen cannot overwrite newer terms', async () => {
    const { db, creator } = moneyDb();
    const offer = await makeOffer(db, creator, { event_id: EVENT, property_id: PROPERTY, ...terms });
    await respondToOffer(db, OWNER, offer.id, { action: 'counter', version: 1, ...terms, rate: 45000 });
    await expect(respondToOffer(db, CREATOR, offer.id, { action: 'accept', version: 1 })).rejects.toMatchObject({ code: 'stale' });
  });

  it('only the creator of an approved plan can offer, once per property, never to themself', async () => {
    const { db, creator, guest } = moneyDb();
    await expect(makeOffer(db, guest, { event_id: EVENT, property_id: PROPERTY, ...terms })).rejects.toMatchObject({ status: 403 });
    await makeOffer(db, creator, { event_id: EVENT, property_id: PROPERTY, ...terms });
    await expect(makeOffer(db, creator, { event_id: EVENT, property_id: PROPERTY, ...terms })).rejects.toMatchObject({ status: 409 });
    const draft = moneyDb({ status: 'draft' });
    await expect(makeOffer(draft.db, draft.creator, { event_id: EVENT, property_id: PROPERTY, ...terms })).rejects.toMatchObject({ status: 409 });
    expect(GUEST).toBeTruthy();
  });
});
