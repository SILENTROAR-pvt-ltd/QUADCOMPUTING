import { describe, it, expect } from 'vitest';
import { cleanOfferRequest, makeRedeemCode } from '@/lib/services/offers/offer-request-input';

const OFFER = 'aaaaaaaa-1111-4222-8333-444444444444';

describe('Offer requests: what a guest may send', () => {
  it('makes short codes without the look-alike characters', () => {
    for (let i = 0; i < 50; i++) {
      const code = makeRedeemCode();
      expect(code).toMatch(/^[A-Z2-9]{6}$/);
      expect(code).not.toMatch(/[01IO]/);
    }
  });

  it('accepts a redeem, and drops any message sent with it', () => {
    const out = cleanOfferRequest({ offer_id: OFFER, kind: 'redeem', message: 'ignored', guest_name: ' Asha ', table_number: 'T-03' });
    expect(out).toEqual({
      ok: true,
      value: { offerId: OFFER, kind: 'redeem', message: null, guestName: 'Asha', table: 'T-03' },
    });
  });

  it('needs a question for an inquiry, and strips markup from it', () => {
    expect(cleanOfferRequest({ offer_id: OFFER, kind: 'inquiry', message: '   ' })).toMatchObject({ ok: false, error: 'Write your question first.' });
    const out = cleanOfferRequest({ offer_id: OFFER, kind: 'inquiry', message: '<b>Terrace?</b>' });
    expect(out).toMatchObject({ ok: true, value: { kind: 'inquiry', message: 'b Terrace? /b' } });
  });

  it('refuses a request without a real offer or a known kind', () => {
    expect(cleanOfferRequest({ offer_id: 'nope', kind: 'redeem' })).toMatchObject({ ok: false, error: 'Choose an offer.' });
    expect(cleanOfferRequest({ offer_id: OFFER, kind: 'buy' })).toMatchObject({ ok: false });
  });
});
