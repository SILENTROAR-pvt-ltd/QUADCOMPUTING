import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { businessModel, modulesFor, normalizeVenueTypes } from '@/lib/venue/venue-model';
import { checkPin, encodePin, isPinSet, pinColumns } from '@/lib/services/security/venue-pin';
import { pinProblem } from '@/lib/services/security/pin-rules';
import { readLocks } from '@/lib/services/security/protected-modules';
import { parseProfile } from '@/lib/services/profile/profile-input';

const ctx = vi.hoisted(() => ({ db: null as any }));
vi.mock('@/lib/supabase/admin', () => ({ adminDb: () => ctx.db }));
import { setVenuePin } from '@/lib/services/security/venue-pin.service';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';

describe('Venue type decides the sidebar', () => {
  it('shows a café no rooms, a homestay no kitchen, and a hotel with a restaurant everything', () => {
    expect(businessModel(['cafe'])).toBe('food');
    expect(businessModel(['homestay'])).toBe('stay');
    expect(businessModel(['restaurant', 'hotel'])).toBe('both');
    expect(businessModel(['cafe'], true)).toBe('both'); // older "offers accommodation" switch
    expect(modulesFor('food')).not.toContain('accommodations');
    expect(modulesFor('stay')).toEqual(expect.arrayContaining(['accommodations', 'billing']));
    expect(modulesFor('stay')).not.toContain('kitchen');
    expect(normalizeVenueTypes(['dorm', 'estate', 'spaceship', 'cafe', 'cafe'])).toEqual(['hostel', 'villa', 'cafe']);
  });

  it('reads venues created with the old sign-up names, so their sidebar is right from day one', () => {
    expect(normalizeVenueTypes(['Cafe', 'Restaurant', 'Hotel', 'Rooms', 'Lounge'])).toEqual(['cafe', 'restaurant', 'hotel', 'bar']);
    expect(businessModel(['Hotel'])).toBe('stay');
    expect(businessModel(['Cafe', 'Rooms'])).toBe('both');
  });
});

describe('PINs', () => {
  it('refuses guessable PINs', () => {
    expect(pinProblem('1111')).toMatch(/repeated/);
    expect(pinProblem('1234')).toMatch(/run of digits/);
    expect(pinProblem('4821')).toBeNull();
  });

  it('stores only a hash, verifies it, and upgrades an old plain-text PIN once it is entered', async () => {
    const row = { admin_pin_hash: await encodePin('4821') };
    expect(await checkPin(row, 'admin', '4821')).toEqual({ ok: true, upgrade: false });
    expect(await checkPin(row, 'admin', '4822')).toEqual({ ok: false, upgrade: false });
    expect(await checkPin({ admin_pin: '7392' }, 'admin', '7392')).toEqual({ ok: true, upgrade: true });
    expect(await pinColumns('staff', '5930')).toMatchObject({ staff_pin: null, staff_pin_hash: expect.stringMatching(/^scrypt:/) });
  });

  it('needs the current master PIN to change it, and keeps master and staff PINs different', async () => {
    ctx.db = createFakeSupabase({ businesses: [{ id: BIZ, admin_pin: '7392' }] });
    expect(await setVenuePin(BIZ, 'admin', '4821', '0000')).toMatchObject({ ok: false, status: 401 });
    expect(await setVenuePin(BIZ, 'admin', '4821', '7392')).toMatchObject({ ok: true, isAdminPinSet: true });
    const row = ctx.db.tables.businesses[0];
    expect(row.admin_pin).toBeNull();
    expect((await checkPin(row, 'admin', '4821')).ok).toBe(true);
    expect(await setVenuePin(BIZ, 'staff', '4821', '4821')).toMatchObject({ ok: false, status: 400 });
    expect(await setVenuePin(BIZ, 'staff', '5930', '4821')).toMatchObject({ ok: true, isStaffPinSet: true });
    expect(await setVenuePin(BIZ, 'admin', null, '4821')).toMatchObject({ ok: true, isAdminPinSet: false });
    expect(isPinSet(ctx.db.tables.businesses[0], 'staff')).toBe(true);
  });
});

describe('Section locks', () => {
  beforeEach(() => { ctx.db = null; });
  it('can lock any section, defaults the rest, and always locks profile and wallet', () => {
    const l = readLocks('{"kitchen":true,"profile":false,"made_up":true}');
    expect(l).toMatchObject({ kitchen: true, billing: false, dashboard: true, profile: true, wallet: true });
    expect(l).not.toHaveProperty('made_up');
  });
});

describe('Profile form', () => {
  const base = { owner: { fullName: 'Joshi' }, venue: { businessName: 'Bombay Rasoi', venueTypes: ['cafe'] } };
  it('saves the registration type, tidies identifiers and points at the field that is wrong', () => {
    const ok = parseProfile({ ...base, venue: { ...base.venue, registrationType: 'pvt', gstNumber: '02aabcb1234c1z5', panNumber: 'abcde1234f' }, owner: { fullName: 'Joshi', phone: '+91 98765 43210' } });
    expect(ok).toMatchObject({ ok: true, value: { venue: { registration_type: 'pvt', gst_number: '02AABCB1234C1Z5', pan_number: 'ABCDE1234F' }, owner: { phone: '9876543210' }, offersAccommodation: false } });
    expect(parseProfile({ ...base, venue: { ...base.venue, panNumber: 'ABC' } })).toMatchObject({ ok: false, field: 'venue.panNumber' });
    expect(parseProfile({ ...base, venue: { ...base.venue, venueTypes: [] } })).toMatchObject({ ok: false, field: 'venue.venueTypes' });
    expect(parseProfile({ ...base, banking: { accountNumber: '123456789012' } })).toMatchObject({ ok: false, field: 'banking.ifsc' });
  });

  it('keeps stay times only for venues with stays', () => {
    const r = parseProfile({ ...base, venue: { ...base.venue, venueTypes: ['homestay'], checkinTime: '13:00' } });
    expect(r).toMatchObject({ ok: true, value: { offersAccommodation: true, venue: { checkin_time: '13:00' } } });
  });
});
