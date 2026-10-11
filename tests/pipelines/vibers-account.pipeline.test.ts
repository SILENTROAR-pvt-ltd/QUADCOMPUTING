import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({}) }));

import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { hashPin, hashSessionToken } from '@/lib/auth/guest-auth';
import { hashWalletSecret } from '@/lib/services/wallet/wallet-claim.service';
import { summarize } from '@/lib/services/guest-auth/guest-account.service';
import { createVibersProfile } from '@/lib/services/guest-auth/vibers-profile.service';
import { connectVenue } from '@/lib/services/guest-auth/vibers-connect.service';

const USER = '11111111-aaaa-4bbb-8ccc-000000000001';
const OTHER_USER = '11111111-aaaa-4bbb-8ccc-000000000002';
const CAFE = 'aaaaaaaa-1111-4222-8333-444444444444';
const HOTEL = 'bbbbbbbb-1111-4222-8333-444444444444';
const DEVICE = 'D'.repeat(40);
const OTHER_DEVICE = 'E'.repeat(40);

const legacyRow = async (over: Record<string, unknown> = {}) => {
  const pin = await hashPin('123456');
  return {
    id: 'legacy-cafe', business_id: CAFE, user_id: null, handle: '@asha', display_name: 'Asha', phone: '9000000001', avatar: '☕',
    photo_path: null, traveller_type: null, intro: null, pin_hash: pin.hash, pin_salt: pin.salt, failed_attempts: 0, locked_until: null, ...over,
  };
};

const profile = (db: any, over: Record<string, unknown> = {}) => createVibersProfile(db, {
  userId: USER, rawHandle: 'asha', rawName: 'Asha', rawPhone: '9000000001', walletSecret: DEVICE, ...over,
});

const claimOf = (db: any, key: string) => db.tables.guest_wallet_claims?.find((c: any) => c.guest_key === key);

describe('Making a Vibers profile (one @handle for every property)', () => {
  it('a free handle becomes the person’s, and this device holds its wallet claim', async () => {
    const db = createFakeSupabase({ vibers_accounts: [], guest_accounts: [], guest_wallets: [], guest_wallet_claims: [] });
    const res = await profile(db);
    expect(res).toMatchObject({ ok: true, profile: { user_id: USER, handle: '@asha', display_name: 'Asha' } });
    expect(claimOf(db, '@asha')?.secret_hash).toBe(hashWalletSecret(DEVICE));
  });

  it('making it again returns the same profile, unchanged', async () => {
    const db = createFakeSupabase({ vibers_accounts: [], guest_accounts: [], guest_wallets: [], guest_wallet_claims: [] });
    await profile(db);
    const again = await profile(db, { rawHandle: 'someoneelse', rawName: 'Changed' });
    expect(again).toMatchObject({ ok: true, profile: { handle: '@asha', display_name: 'Asha' } });
    expect(db.tables.vibers_accounts).toHaveLength(1);
  });

  it('a handle another person’s profile holds is refused', async () => {
    const db = createFakeSupabase({ vibers_accounts: [{ user_id: OTHER_USER, handle: '@asha', display_name: 'Other' }], guest_accounts: [] });
    expect(await profile(db)).toMatchObject({ ok: false, status: 409, code: 'handle_taken' });
  });

  it('a handle whose wallet holds money but was never claimed is refused, not handed to the first to register', async () => {
    const db = createFakeSupabase({ vibers_accounts: [], guest_accounts: [], guest_wallets: [{ id: 'w1', guest_id: '@asha', business_id: CAFE }], guest_wallet_claims: [] });
    expect(await profile(db)).toMatchObject({ ok: false, code: 'handle_taken' });
    expect(db.tables.vibers_accounts).toHaveLength(0);
  });

  it('a handle whose wallet another device claimed is refused', async () => {
    const db = createFakeSupabase({ vibers_accounts: [], guest_accounts: [], guest_wallets: [], guest_wallet_claims: [{ guest_key: '@asha', secret_hash: hashWalletSecret(OTHER_DEVICE) }] });
    expect(await profile(db)).toMatchObject({ ok: false, code: 'handle_taken' });
  });
});

describe('Bringing an old @handle + PIN account across', () => {
  it('without its PIN, nothing is created and the PIN is asked for', async () => {
    const db = createFakeSupabase({ vibers_accounts: [], guest_accounts: [await legacyRow()] });
    expect(await profile(db)).toMatchObject({ ok: false, status: 401, code: 'legacy_pin_required' });
    expect(db.tables.vibers_accounts).toHaveLength(0);
    expect(db.tables.guest_accounts[0].user_id).toBeNull();
  });

  it('a wrong PIN is refused and counts toward that account’s lockout', async () => {
    const db = createFakeSupabase({ vibers_accounts: [], guest_accounts: [await legacyRow()] });
    expect(await profile(db, { legacyPin: '000000' })).toMatchObject({ ok: false, code: 'legacy_pin_required' });
    expect(db.tables.guest_accounts[0].failed_attempts).toBe(1);
    expect(db.tables.vibers_accounts).toHaveLength(0);
  });

  it('a locked account cannot be brought across, even with the right PIN', async () => {
    const db = createFakeSupabase({ vibers_accounts: [], guest_accounts: [await legacyRow({ locked_until: new Date(Date.now() + 600e3).toISOString(), failed_attempts: 5 })] });
    expect(await profile(db, { legacyPin: '123456' })).toMatchObject({ ok: false, status: 423 });
  });

  it('the right PIN links every property’s record and moves the wallet claim to this device', async () => {
    const db = createFakeSupabase({
      vibers_accounts: [],
      guest_accounts: [await legacyRow(), await legacyRow({ id: 'legacy-hotel', business_id: HOTEL })],
      guest_wallet_claims: [{ guest_key: '@asha', secret_hash: hashWalletSecret(OTHER_DEVICE) }],
    });
    expect(await profile(db, { legacyPin: '123456' })).toMatchObject({ ok: true });
    expect(db.tables.guest_accounts.map((r: any) => r.user_id)).toEqual([USER, USER]);
    expect(claimOf(db, '@asha')?.secret_hash).toBe(hashWalletSecret(DEVICE));
  });

  it('a handle already linked to someone else is refused, PIN or not', async () => {
    const db = createFakeSupabase({ vibers_accounts: [], guest_accounts: [await legacyRow({ user_id: OTHER_USER })] });
    expect(await profile(db, { legacyPin: '123456' })).toMatchObject({ ok: false, code: 'handle_taken' });
  });
});

describe('Signing in at a property with the Vibers account', () => {
  const withProfile = (rows: Record<string, any[]> = {}) => createFakeSupabase({
    vibers_accounts: [{ user_id: USER, handle: '@asha', display_name: 'Asha', phone: '9000000001', avatar: '☕', traveller_type: null, intro: null }],
    guest_accounts: [], guest_auth_sessions: [], guest_wallet_claims: [], ...rows,
  });

  it('without a profile, the person is asked to finish it', async () => {
    const db = createFakeSupabase({ vibers_accounts: [], guest_accounts: [] });
    expect(await connectVenue(db, USER, CAFE, DEVICE)).toMatchObject({ ok: false, code: 'needs_profile' });
  });

  it('the first visit makes this property’s record (no PIN) and a session, and this device may read the wallet', async () => {
    const db = withProfile();
    const res = await connectVenue(db, USER, CAFE, DEVICE);
    expect(res.ok).toBe(true);
    const row = db.tables.guest_accounts[0];
    expect(row).toMatchObject({ business_id: CAFE, user_id: USER, handle: '@asha', pin_hash: null, pin_salt: null });
    if (res.ok) {
      expect(db.tables.guest_auth_sessions[0]).toMatchObject({ account_id: row.id, business_id: CAFE, token_hash: hashSessionToken(res.sessionToken) });
      expect(summarize(res.account).has_pin).toBe(false);
    }
    expect(claimOf(db, '@asha')?.secret_hash).toBe(hashWalletSecret(DEVICE));
  });

  it('later visits reuse the record; each property keeps its own', async () => {
    const db = withProfile();
    await connectVenue(db, USER, CAFE, DEVICE);
    await connectVenue(db, USER, CAFE, DEVICE);
    await connectVenue(db, USER, HOTEL, DEVICE);
    expect(db.tables.guest_accounts.map((r: any) => r.business_id).sort()).toEqual([CAFE, HOTEL].sort());
  });

  it('an unlinked record with the same handle at this property is never taken over', async () => {
    const db = withProfile({ guest_accounts: [await legacyRow()] });
    expect(await connectVenue(db, USER, CAFE, DEVICE)).toMatchObject({ ok: false, code: 'handle_conflict' });
    expect(db.tables.guest_auth_sessions).toHaveLength(0);
  });

  it('before migration 19 is applied, it says so instead of failing', async () => {
    const missing = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: { code: '42P01', message: 'missing' } }) }) }) }) };
    expect(await connectVenue(missing, USER, CAFE, DEVICE)).toMatchObject({ ok: false, status: 503, code: 'not_ready' });
  });
});
