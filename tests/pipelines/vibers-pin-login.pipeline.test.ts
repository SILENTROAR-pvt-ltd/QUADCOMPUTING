import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({}) }));

import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { hashPin } from '@/lib/auth/guest-auth';
import { isWeakPin } from '@/lib/auth/pin-strength';
import { createVibersProfile } from '@/lib/services/guest-auth/vibers-profile.service';
import { connectVenue } from '@/lib/services/guest-auth/vibers-connect.service';
import { pinSignIn } from '@/lib/services/guest-auth/vibers-pin-login.service';

const USER = '11111111-aaaa-4bbb-8ccc-000000000001';
const CAFE = 'aaaaaaaa-1111-4222-8333-444444444444';
const HOTEL = 'bbbbbbbb-1111-4222-8333-444444444444';
const DEVICE = 'D'.repeat(40);

const emptyDb = () => createFakeSupabase({ vibers_accounts: [], guest_accounts: [], guest_wallets: [], guest_wallet_claims: [], guest_auth_sessions: [] });

/** A new person signs up at the cafe and chooses a PIN, the way the profile step does. */
async function signUpAtCafe(pin = '482910') {
  const db = emptyDb();
  const made = await createVibersProfile(db, { userId: USER, rawHandle: 'asha', rawName: 'Asha', rawPhone: '9000000001', walletSecret: DEVICE });
  expect(made.ok).toBe(true);
  const connected = await connectVenue(db, USER, CAFE, DEVICE, await hashPin(pin));
  expect(connected.ok).toBe(true);
  return db;
}

describe('A new person chooses a PIN at sign-up and signs in with @handle + PIN', () => {
  it('stores the PIN as a hash on their guest record, never the digits', async () => {
    const db = await signUpAtCafe();
    const row = db.tables.guest_accounts[0];
    expect(row.user_id).toBe(USER);
    expect(row.pin_hash).toBeTruthy();
    expect(JSON.stringify(row)).not.toContain('482910');
  });

  it('signs in at the same venue with the right PIN and starts a session', async () => {
    const db = await signUpAtCafe();
    const res = await pinSignIn({ db, businessId: CAFE, rawHandle: '@Asha', pin: '482910', walletSecret: DEVICE });
    expect(res).toMatchObject({ ok: true, account: { handle: '@asha' } });
    expect(db.tables.guest_auth_sessions.length).toBeGreaterThan(0);
  });

  it('works at a venue the person has never visited: same handle, same PIN, record created there', async () => {
    const db = await signUpAtCafe();
    const res = await pinSignIn({ db, businessId: HOTEL, rawHandle: 'asha', pin: '482910', walletSecret: DEVICE });
    expect(res).toMatchObject({ ok: true, account: { business_id: HOTEL, handle: '@asha' } });
    const atHotel = db.tables.guest_accounts.find((r: any) => r.business_id === HOTEL);
    expect(atHotel?.pin_hash).toBeTruthy();
  });

  it('a wrong PIN, an unknown handle and a handle with no PIN all get the same refusal', async () => {
    const db = await signUpAtCafe();
    const wrong = await pinSignIn({ db, businessId: CAFE, rawHandle: 'asha', pin: '000111', walletSecret: DEVICE });
    const unknown = await pinSignIn({ db, businessId: CAFE, rawHandle: 'nobody', pin: '482910', walletSecret: DEVICE });
    expect(wrong).toMatchObject({ ok: false, status: 401, error: 'Handle or PIN is incorrect.' });
    expect(unknown).toMatchObject({ ok: false, status: 401, error: 'Handle or PIN is incorrect.' });

    // Made a profile by email only, never set a PIN.
    const noPin = emptyDb();
    await createVibersProfile(noPin, { userId: USER, rawHandle: 'ravi', rawName: 'Ravi', rawPhone: '9000000002', walletSecret: DEVICE });
    await connectVenue(noPin, USER, CAFE, DEVICE);
    expect(await pinSignIn({ db: noPin, businessId: CAFE, rawHandle: 'ravi', pin: '482910', walletSecret: DEVICE })).toMatchObject({ ok: false, status: 401 });
  });

  it('locks after repeated wrong PINs, even at a venue they have not visited', async () => {
    const db = await signUpAtCafe();
    let last: any;
    for (let i = 0; i < 10; i++) last = await pinSignIn({ db, businessId: HOTEL, rawHandle: 'asha', pin: '111222', walletSecret: DEVICE });
    expect(last).toMatchObject({ ok: false, status: 423 });
    // Locked means even the right PIN is refused for now.
    expect(await pinSignIn({ db, businessId: HOTEL, rawHandle: 'asha', pin: '482910', walletSecret: DEVICE })).toMatchObject({ ok: false, status: 423 });
  });

  it('carries the PIN to a new venue when the person signs in there with email', async () => {
    const db = await signUpAtCafe();
    const connected: any = await connectVenue(db, USER, HOTEL, DEVICE);
    expect(connected.ok).toBe(true);
    expect(connected.account.pin_hash).toBeTruthy();
  });

  it('rejects PINs that are not 6 digits', async () => {
    const db = await signUpAtCafe();
    expect(await pinSignIn({ db, businessId: CAFE, rawHandle: 'asha', pin: '4829', walletSecret: DEVICE })).toMatchObject({ ok: false, status: 401 });
    expect(await pinSignIn({ db, businessId: CAFE, rawHandle: 'asha', pin: 'abcdef', walletSecret: DEVICE })).toMatchObject({ ok: false, status: 401 });
  });
});

describe('weak PINs', () => {
  it('refuses repeats and straight runs, allows ordinary PINs', () => {
    for (const weak of ['111111', '000000', '123456', '654321', '234567', '012345']) expect(isWeakPin(weak)).toBe(true);
    for (const fine of ['482910', '135792', '908172']) expect(isWeakPin(fine)).toBe(false);
  });
});
