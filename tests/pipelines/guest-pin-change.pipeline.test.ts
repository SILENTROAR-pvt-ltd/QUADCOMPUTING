import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { hashPin, verifyPin, hashSessionToken } from '@/lib/auth/guest-auth';
import { changeGuestPin, recoverGuestPin, type GuestAccount } from '@/lib/services/guest-auth/guest-account.service';
import { hashWalletSecret } from '@/lib/services/wallet/wallet-claim.service';

const DEVICE = 'D'.repeat(40);
const OTHER_DEVICE = 'E'.repeat(40);

async function recoverySetup(opts: { failed?: number; locked?: string | null; claimedBy?: string | null } = {}) {
  const pin = await hashPin('123456');
  const db = createFakeSupabase({
    guest_accounts: [{
      id: 'acc-1', business_id: BIZ, handle: '@asha', display_name: 'Asha', phone: '9000000001', avatar: '☕', photo_path: null,
      traveller_type: null, intro: null, pin_hash: pin.hash, pin_salt: pin.salt, failed_attempts: opts.failed ?? 0, locked_until: opts.locked ?? null,
    }],
    guest_auth_sessions: [
      { id: 's-old', account_id: 'acc-1', business_id: BIZ, token_hash: hashSessionToken('old-token-lost-phone-0123456789abc'), expires_at: new Date(Date.now() + 3600e3).toISOString() },
    ],
    guest_wallet_claims: opts.claimedBy === null ? [] : [{ guest_key: '@asha', secret_hash: hashWalletSecret(opts.claimedBy ?? DEVICE) }],
  });
  return db;
}

const recover = (db: any, over: Partial<{ rawHandle: unknown; rawPhone: unknown; newPin: unknown; walletSecret: string | null }> = {}) =>
  recoverGuestPin(db, {
    businessId: BIZ,
    rawHandle: '@asha',
    rawPhone: '9000000001',
    newPin: '654321',
    walletSecret: DEVICE,
    ...over,
  });

describe('Forgot PIN, self-service (the mobile number on the account, on the device that signed up)', () => {
  it('the right mobile number on the device that holds the wallet claim resets the PIN and signs this device in', async () => {
    const db = await recoverySetup();
    const res = await recover(db);
    expect(res.ok).toBe(true);
    const stored = db.tables.guest_accounts[0];
    expect(await verifyPin('654321', { hash: stored.pin_hash, salt: stored.pin_salt })).toBe(true);
    expect(db.tables.guest_auth_sessions.some((s: any) => s.token_hash === hashSessionToken('old-token-lost-phone-0123456789abc'))).toBe(false);
    if (res.ok) expect(db.tables.guest_auth_sessions.some((s: any) => s.token_hash === hashSessionToken(res.sessionToken))).toBe(true);
  });

  it('a device that did not sign up cannot reset it, even with the right mobile number', async () => {
    const db = await recoverySetup({ claimedBy: DEVICE });
    const res = await recover(db, { walletSecret: OTHER_DEVICE });
    expect(res).toMatchObject({ ok: false, status: 401 });
    expect(db.tables.guest_accounts[0].failed_attempts).toBe(1);
  });

  it('a device with no wallet secret cannot reset it', async () => {
    const db = await recoverySetup();
    expect(await recover(db, { walletSecret: null })).toMatchObject({ ok: false, status: 401 });
  });

  it('a wrong mobile number is refused and counts toward the lockout', async () => {
    const db = await recoverySetup();
    expect(await recover(db, { rawPhone: '9111111111' })).toMatchObject({ ok: false, status: 401 });
    expect(db.tables.guest_accounts[0].failed_attempts).toBe(1);
  });

  it('an unknown handle gets the same refusal as a wrong number', async () => {
    const db = await recoverySetup();
    const unknown = await recover(db, { rawHandle: '@nobody' });
    const wrongPhone = await recover(db, { rawPhone: '9111111111' });
    expect(unknown.ok).toBe(false);
    expect(wrongPhone.ok).toBe(false);
    if (!unknown.ok && !wrongPhone.ok) {
      expect(unknown.error).toBe(wrongPhone.error);
      expect(unknown.status).toBe(wrongPhone.status);
    }
  });

  it('an account in lockout cannot be recovered until the lock passes', async () => {
    const db = await recoverySetup({ locked: new Date(Date.now() + 10 * 60_000).toISOString(), failed: 5 });
    expect(await recover(db)).toMatchObject({ ok: false, status: 423 });
  });

  it('the new PIN must be six digits', async () => {
    const db = await recoverySetup();
    expect(await recover(db, { newPin: '12' })).toMatchObject({ ok: false, status: 400 });
  });
});

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';

async function setup(failed = 0, lockedUntil: string | null = null) {
  const pin = await hashPin('123456');
  const account: GuestAccount = {
    id: 'acc-1', business_id: BIZ, handle: '@asha', display_name: 'Asha', phone: null, avatar: '☕', photo_path: null,
    traveller_type: null, intro: null, pin_hash: pin.hash, pin_salt: pin.salt, failed_attempts: failed, locked_until: lockedUntil,
  };
  const db = createFakeSupabase({
    guest_accounts: [{ ...account }],
    guest_auth_sessions: [
      { id: 's-old-1', account_id: 'acc-1', business_id: BIZ, token_hash: hashSessionToken('old-token-phone-one-0123456789'), expires_at: new Date(Date.now() + 3600e3).toISOString() },
      { id: 's-old-2', account_id: 'acc-1', business_id: BIZ, token_hash: hashSessionToken('old-token-phone-two-0123456789'), expires_at: new Date(Date.now() + 3600e3).toISOString() },
    ],
  });
  return { db, account };
}

describe('Changing the PIN while signed in', () => {
  it('a correct current PIN and a valid new PIN change the PIN', async () => {
    const { db, account } = await setup();
    const res = await changeGuestPin(db, account, { currentPin: '123456', newPin: '654321' });
    expect(res.ok).toBe(true);
    const stored = db.tables.guest_accounts[0];
    expect(await verifyPin('654321', { hash: stored.pin_hash, salt: stored.pin_salt })).toBe(true);
    expect(await verifyPin('123456', { hash: stored.pin_hash, salt: stored.pin_salt })).toBe(false);
  });

  it('ends every other session and gives this device a fresh one', async () => {
    const { db, account } = await setup();
    const res = await changeGuestPin(db, account, { currentPin: '123456', newPin: '654321' });
    expect(res.ok).toBe(true);
    const sessions = db.tables.guest_auth_sessions;
    expect(sessions.some((s: any) => s.token_hash === hashSessionToken('old-token-phone-one-0123456789'))).toBe(false);
    expect(sessions.some((s: any) => s.token_hash === hashSessionToken('old-token-phone-two-0123456789'))).toBe(false);
    if (res.ok) expect(sessions.some((s: any) => s.token_hash === hashSessionToken(res.sessionToken))).toBe(true);
  });

  it('a wrong current PIN is refused and counts toward the lockout', async () => {
    const { db, account } = await setup();
    const res = await changeGuestPin(db, account, { currentPin: '000000', newPin: '654321' });
    expect(res).toEqual({ ok: false, status: 401, error: 'Your current PIN is incorrect.' });
    expect(db.tables.guest_accounts[0].failed_attempts).toBe(1);
    expect(db.tables.guest_auth_sessions).toHaveLength(2);
  });

  it('an account in lockout cannot change its PIN, even with the right current PIN', async () => {
    const future = new Date(Date.now() + 10 * 60_000).toISOString();
    const { db, account } = await setup(5, future);
    const res = await changeGuestPin(db, account, { currentPin: '123456', newPin: '654321' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(423);
  });

  it('refuses a new PIN that is not six digits, or the same as the current one', async () => {
    const { db, account } = await setup();
    expect((await changeGuestPin(db, account, { currentPin: '123456', newPin: '12ab' })) as any).toMatchObject({ ok: false, status: 400 });
    expect((await changeGuestPin(db, account, { currentPin: '123456', newPin: '123456' })) as any).toMatchObject({ ok: false, status: 400 });
    expect(db.tables.guest_auth_sessions).toHaveLength(2);
  });
});
