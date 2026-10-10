import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { hashWalletSecret } from '@/lib/services/wallet/wallet-claim.service';

const ctx = vi.hoisted(() => ({ db: null as any }));
vi.mock('@/lib/supabase/admin', () => ({ adminDb: () => ctx.db, getAdminClient: () => ctx.db }));

import { GET as getWallet } from '@/app/api/guest/wallet/route';
import { POST as redeemPost, GET as redeemGet } from '@/app/api/guest/wallet/redeem/route';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const SECRET_A = 'A'.repeat(40);
const SECRET_B = 'B'.repeat(40);

const authed = (secret?: string): Record<string, string> => (secret ? { 'x-guest-wallet-secret': secret } : {});
const wallet = (guest: string, secret?: string) =>
  getWallet(new Request(`http://localhost/api/guest/wallet?guest_id=${encodeURIComponent(guest)}&cafe_id=${BIZ}`, { headers: authed(secret) }));
const redeem = (guest: string, secret?: string) =>
  redeemPost(
    new Request(`http://localhost/api/guest/wallet/redeem?cafe_id=${BIZ}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authed(secret) },
      body: JSON.stringify({ guest_id: guest, guest_handle: guest, table_number: 'T-02' }),
    })
  );

/** A handle claimed at sign-up by a device: the only way a handle gets claimed. */
const claimAtSignUp = (guest: string, secret: string) => {
  ctx.db.tables.guest_wallet_claims.push({ guest_key: guest, secret_hash: hashWalletSecret(secret) });
};

function newDb() {
  return createFakeSupabase(
    {
      businesses: [{ id: BIZ, business_name: 'Venus Cafe' }],
      guest_wallets: [
        { id: '10000000-1111-4222-8333-444444444444', guest_id: '@asha', business_id: BIZ, cafe_id: BIZ, balance: 120, total_cashback_earned: 120 },
        { id: '20000000-1111-4222-8333-444444444444', guest_id: '@meera', business_id: BIZ, cafe_id: BIZ, balance: 75, total_cashback_earned: 75 },
        { id: '30000000-1111-4222-8333-444444444444', guest_id: '@kabir', business_id: BIZ, cafe_id: BIZ, balance: 40, total_cashback_earned: 40 },
      ],
      wallet_transactions: [],
      wallet_redemptions: [],
      guest_wallet_claims: [],
    },
    { unique: { wallet_redemptions: [['code'], { cols: ['business_id', 'guest_id'], where: (r) => r.status === 'pending' }] } }
  );
}

describe('Guest wallet ownership (read + redeem require proof of ownership)', () => {
  beforeEach(() => {
    ctx.db = newDb();
  });

  it('shows nothing without a secret, and does not claim anything', async () => {
    const res = await wallet('@asha');
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.wallet.balance).toBe(0);
    expect(json.cafe_wallets).toEqual([]);
    expect(ctx.db.tables.guest_wallet_claims).toHaveLength(0);
  });

  it('a read never claims an unclaimed handle, so a device cannot take a wallet by asking first', async () => {
    const json = await (await wallet('@asha', SECRET_A)).json();

    expect(json.wallet.balance).toBe(0);
    expect(json.handle_taken).toBe(false);
    expect(ctx.db.tables.guest_wallet_claims).toHaveLength(0);
  });

  it('the device that claimed the handle at sign-up sees the real balance, and only a hash is stored', async () => {
    claimAtSignUp('@asha', SECRET_A);
    const json = await (await wallet('@asha', SECRET_A)).json();

    expect(json.wallet.balance).toBe(120);
    expect(json.global_balance).toBe(120);
    expect(json.handle_taken).toBe(false);
    expect(JSON.stringify(ctx.db.tables.guest_wallet_claims)).not.toContain(SECRET_A);
  });

  it('a different device sees an empty wallet and is told the handle is taken', async () => {
    claimAtSignUp('@asha', SECRET_A);
    const json = await (await wallet('@asha', SECRET_B)).json();

    expect(json.wallet.balance).toBe(0);
    expect(json.transactions).toEqual([]);
    expect(json.global_balance).toBe(0);
    expect(json.handle_taken).toBe(true);
  });

  it('the owner keeps access, and handles compare case-insensitively', async () => {
    claimAtSignUp('@asha', SECRET_A);
    expect((await (await wallet('@asha', SECRET_A)).json()).wallet.balance).toBe(120);
    expect((await (await wallet('@ASHA', SECRET_A)).json()).wallet.balance).toBe(120);
  });

  it('a name is never an identifier', async () => {
    claimAtSignUp('@asha', SECRET_A);
    const res = await getWallet(
      new Request(`http://localhost/api/guest/wallet?guest_id=gst-current&name=%40asha&cafe_id=${BIZ}`, { headers: authed(SECRET_A) })
    );
    expect((await res.json()).wallet.balance).toBe(0);
  });

  it('redemption is refused for a wallet the caller does not own', async () => {
    claimAtSignUp('@meera', SECRET_A); // device A owns @meera

    const attacker = await redeem('@meera', SECRET_B);
    expect(attacker.status).toBe(403);
    expect(ctx.db.tables.wallet_redemptions).toHaveLength(0);

    const noSecret = await redeem('@meera');
    expect(noSecret.status).toBe(403);
  });

  it('the owner can redeem and then sees the active code; others cannot see it', async () => {
    claimAtSignUp('@kabir', SECRET_A);

    const created = await redeem('@kabir', SECRET_A);
    const body = await created.json();
    expect(created.status).toBe(200);
    expect(body.redemption).toMatchObject({ status: 'pending', amount: 40, business_id: BIZ });
    expect(body.redemption.code).toMatch(/^QC-RDM-\d{6}$/);

    const mineReq = new Request(`http://localhost/api/guest/wallet/redeem?guest_id=%40kabir&cafe_id=${BIZ}`, { headers: authed(SECRET_A) });
    expect((await (await redeemGet(mineReq)).json()).active_redemption.code).toBe(body.redemption.code);

    const theirsReq = new Request(`http://localhost/api/guest/wallet/redeem?guest_id=%40kabir&cafe_id=${BIZ}`, { headers: authed(SECRET_B) });
    expect((await (await redeemGet(theirsReq)).json()).active_redemption).toBeNull();
  });

  it('fails closed (503) when ownership cannot be verified', async () => {
    ctx.db = createFakeSupabase(
      { businesses: [{ id: BIZ, business_name: 'Venus Cafe' }], guest_wallets: [] },
      { failOn: { 'guest_wallet_claims.select': () => true } }
    );
    const res = await wallet('@asha', SECRET_A);
    expect(res.status).toBe(503);
  });
});
