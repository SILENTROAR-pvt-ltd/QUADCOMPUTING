import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { normalizeIntro, isTravellerType, travellerTypeInfo, INTRO_MAX, TRAVELLER_TYPES } from '@/lib/guest/traveller-types';
import { summarize, updateGuestProfile, type GuestAccount } from '@/lib/services/guest-auth/guest-account.service';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';

const account = (over: Partial<GuestAccount> = {}): GuestAccount => ({
  id: 'acc-1', business_id: BIZ, handle: '@asha', display_name: 'Asha', phone: '9000000001', avatar: '☕',
  photo_path: null, traveller_type: null, intro: null, pin_hash: 'h', pin_salt: 's', failed_attempts: 0, locked_until: null,
  ...over,
});

function db(row: Partial<GuestAccount> = {}) {
  return createFakeSupabase({ guest_accounts: [{ ...account(row) }] });
}

describe('Traveller types', () => {
  it('offers the traveller types the guest can pick from, each with a label, icon and hint', () => {
    expect(TRAVELLER_TYPES.map((t) => t.id)).toEqual(['solo', 'backpacker', 'family', 'couple', 'business', 'foodie', 'group', 'local']);
    for (const t of TRAVELLER_TYPES) {
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.emoji.length).toBeGreaterThan(0);
      expect(t.hint.length).toBeGreaterThan(0);
    }
  });

  it('accepts only listed ids', () => {
    expect(isTravellerType('backpacker')).toBe(true);
    expect(isTravellerType('pirate')).toBe(false);
    expect(isTravellerType(null)).toBe(false);
    expect(travellerTypeInfo('family')?.label).toBe('Family trip');
    expect(travellerTypeInfo('nope')).toBeNull();
  });
});

describe('Guest intro', () => {
  it('keeps plain text on one line and strips markup and control characters', () => {
    expect(normalizeIntro('  Here for the   dosa,\n not the view  ')).toBe('Here for the dosa, not the view');
    expect(normalizeIntro('<script>alert(1)</script> hi')).toBe('script alert(1) /script hi');
    expect(normalizeIntro('a\u0007b')).toBe('a b');
  });

  it('is capped at the limit and an empty intro means none', () => {
    expect(normalizeIntro('x'.repeat(200))).toHaveLength(INTRO_MAX);
    expect(normalizeIntro('   ')).toBeNull();
    expect(normalizeIntro(42)).toBeNull();
  });
});

describe('Editing the profile', () => {
  it('changes the name, traveller type and intro that were sent, and returns the saved account', async () => {
    const res = await updateGuestProfile(db(), account(), { name: '  Asha Rao ', traveller_type: 'solo', intro: 'Chasing the best dosa' });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.account).toMatchObject({ display_name: 'Asha Rao', traveller_type: 'solo', intro: 'Chasing the best dosa' });
      expect(res.account.handle).toBe('@asha');
    }
  });

  it('leaves fields that were not sent alone', async () => {
    const d = db({ traveller_type: 'couple', intro: 'Table for two' });
    const res = await updateGuestProfile(d, account({ traveller_type: 'couple', intro: 'Table for two' }), { name: 'Asha R' });
    expect(res.ok && res.account).toMatchObject({ display_name: 'Asha R', traveller_type: 'couple', intro: 'Table for two' });
  });

  it('clears the traveller type when told to, and clears the intro when it is left blank', async () => {
    const res = await updateGuestProfile(db({ traveller_type: 'family', intro: 'hi' }), account({ traveller_type: 'family', intro: 'hi' }), { traveller_type: null, intro: '   ' });
    expect(res.ok && res.account).toMatchObject({ traveller_type: null, intro: null });
  });

  it('refuses an empty name', async () => {
    const res = await updateGuestProfile(db(), account(), { name: '   ' });
    expect(res).toEqual({ ok: false, status: 400, error: 'Enter your name.' });
  });

  it('refuses a traveller type that is not on the list', async () => {
    const res = await updateGuestProfile(db(), account(), { traveller_type: 'pirate' });
    expect(res).toEqual({ ok: false, status: 400, error: 'Choose a traveller type from the list.' });
  });

  it('cannot change the handle, which is the wallet identity', async () => {
    const d = db();
    await updateGuestProfile(d, account(), { name: 'Asha', handle: '@someone_else' } as any);
    expect(d.tables.guest_accounts[0].handle).toBe('@asha');
  });

  it('is a no-op when nothing was sent', async () => {
    const res = await updateGuestProfile(db(), account(), {});
    expect(res.ok && res.account.display_name).toBe('Asha');
  });
});

describe('What the browser sees', () => {
  it('includes the traveller type and intro, and nothing private', () => {
    const s = summarize(account({ traveller_type: 'backpacker', intro: 'Budget and beyond' }));
    expect(s).toEqual({
      handle: '@asha', display_name: 'Asha', phone_masked: '•••••01', avatar: '☕', avatar_url: null,
      traveller_type: 'backpacker', intro: 'Budget and beyond', has_pin: true,
    });
    expect(s).not.toHaveProperty('pin_hash');
    expect(s).not.toHaveProperty('pin_salt');
  });
});
