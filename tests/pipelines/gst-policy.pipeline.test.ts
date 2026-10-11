import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { gstStatusOf, loadGstStatus, stripTax } from '@/lib/services/billing/gst-policy';
import { parseProfile } from '@/lib/services/profile/profile-input';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const GSTIN = '02AABCB1234C1Z5';

describe('Only a verified GSTIN may charge GST', () => {
  it('needs a valid GSTIN that the host confirmed, for that exact number', () => {
    expect(gstStatusOf({ gst_number: null })).toMatchObject({ canCharge: false, reason: expect.stringMatching(/Add your GSTIN/) });
    expect(gstStatusOf({ gst_number: 'NOT-A-GSTIN' })).toMatchObject({ canCharge: false, reason: expect.stringMatching(/not valid/) });
    expect(gstStatusOf({ gst_number: GSTIN })).toMatchObject({ canCharge: false, reason: expect.stringMatching(/Confirm your GSTIN/) });
    expect(gstStatusOf({ gst_number: GSTIN, gst_verified_number: '27AABCB1234C1Z5' })).toMatchObject({ canCharge: false });
    expect(gstStatusOf({ gst_number: GSTIN, gst_verified_number: GSTIN.toLowerCase() })).toMatchObject({ canCharge: true, reason: null });
  });

  it('reads the venue, and stays off before the verification column exists', async () => {
    const db = createFakeSupabase({ businesses: [{ id: BIZ, gst_number: GSTIN, gst_verified_number: GSTIN }] });
    expect((await loadGstStatus(db, BIZ)).canCharge).toBe(true);

    let calls = 0;
    const oldDb = { from: () => ({ select: (cols: string) => ({ eq: () => ({ maybeSingle: async () => {
      calls += 1;
      return cols.includes('gst_verified_number')
        ? { data: null, error: { code: '42703', message: 'column does not exist' } }
        : { data: { gst_number: GSTIN }, error: null };
    } }) }) }) };
    expect(await loadGstStatus(oldDb, BIZ)).toMatchObject({ canCharge: false, gstin: GSTIN });
    expect(calls).toBe(2);
  });

  it('removes exactly the tax from a bill a venue may not tax', () => {
    expect(stripTax({ taxAmount: 52.5, grandTotal: 1102.5 })).toEqual({ taxAmount: 0, grandTotal: 1050 });
    expect(stripTax({ taxAmount: 0, grandTotal: 300 })).toEqual({ taxAmount: 0, grandTotal: 300 });
  });
});

describe('The host confirms the GSTIN in My profile', () => {
  const base = { owner: { fullName: 'Asha' }, venue: { businessName: 'Bombay Rasoi', venueTypes: ['cafe'], gstNumber: GSTIN } };

  it('records the confirmation against that GSTIN only when the host ticks it', () => {
    const confirmed = parseProfile({ ...base, venue: { ...base.venue, gstVerified: true } });
    expect(confirmed.ok && confirmed.value.venue.gst_verified_number).toBe(GSTIN);
    const unticked = parseProfile(base);
    expect(unticked.ok && unticked.value.venue.gst_verified_number).toBeNull();
    const noGstin = parseProfile({ ...base, venue: { ...base.venue, gstNumber: '', gstVerified: true } });
    expect(noGstin.ok && noGstin.value.venue.gst_verified_number).toBeNull();
  });
});
