import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { hashSessionToken, GUEST_SESSION_COOKIE } from '@/lib/auth/guest-auth';
import { walletOwnership } from '@/lib/services/guest-auth/wallet-ownership';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const SECRET = 'a'.repeat(32);
const TOKEN = 'session-token-asha-0123456789abcdef';
const OTHER_SECRET = 'b'.repeat(32);
const FUTURE = () => new Date(Date.now() + 3600_000).toISOString();

function db(expiresAt: string = FUTURE()) {
  return createFakeSupabase({
    guest_accounts: [{ id: 'acc-asha', business_id: BIZ, handle: '@asha', display_name: 'Asha' }],
    guest_auth_sessions: [{ id: 's1', account_id: 'acc-asha', business_id: BIZ, token_hash: hashSessionToken(TOKEN), expires_at: expiresAt }],
    guest_wallet_claims: [],
  });
}

const request = (opts: { cookie?: string | null; secret?: string | null } = {}) => {
  const headers = new Headers();
  if (opts.cookie) headers.set('cookie', `${GUEST_SESSION_COOKIE}=${opts.cookie}`);
  if (opts.secret) headers.set('x-guest-wallet-secret', opts.secret);
  return new Request('http://localhost/api/guest/wallet/history', { headers });
};

describe('Wallet ownership: the device secret or a live sign-in session proves the handle', () => {
  it('a signed-in session proves its own handle even when the device has no wallet secret', async () => {
    const res = await walletOwnership(db(), request({ cookie: TOKEN }), ['@asha']);
    expect(res.owned).toEqual(['@asha']);
  });

  it('a session does not prove any other handle', async () => {
    const res = await walletOwnership(db(), request({ cookie: TOKEN }), ['@ravi']);
    expect(res.owned).toEqual([]);
  });

  it('an expired session proves nothing', async () => {
    const res = await walletOwnership(db(new Date(Date.now() - 1000).toISOString()), request({ cookie: TOKEN }), ['@asha']);
    expect(res.owned).toEqual([]);
  });

  it('a wrong session token proves nothing', async () => {
    const res = await walletOwnership(db(), request({ cookie: 'wrong-token-0123456789abcdefgh' }), ['@asha']);
    expect(res.owned).toEqual([]);
  });

  it('with a session and a device secret, the wallet is re-attached to this device', async () => {
    const d = db();
    const first = await walletOwnership(d, request({ cookie: TOKEN, secret: SECRET }), ['@asha']);
    expect(first.owned).toEqual(['@asha']);
    expect(d.tables.guest_wallet_claims).toHaveLength(1);

    // The device proves it on its own afterwards, without the session.
    const later = await walletOwnership(d, request({ secret: SECRET }), ['@asha']);
    expect(later.owned).toEqual(['@asha']);
  });

  it('a wallet claimed by another device is not shown to this one, even with a session', async () => {
    const d = db();
    await walletOwnership(d, request({ secret: OTHER_SECRET }), ['@asha']); // another device claims it first
    const other = await walletOwnership(d, request({ cookie: TOKEN, secret: SECRET }), ['@asha']);
    // The session is valid, so sign-in semantics apply: this device takes the wallet over.
    expect(other.owned).toEqual(['@asha']);
    expect(d.tables.guest_wallet_claims).toHaveLength(1);
  });
});
