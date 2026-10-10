import { describe, it, expect } from 'vitest';
import {
  authorizeGuestIdentifiers,
  hashWalletSecret,
  normalizeGuestKey,
  readWalletSecret,
  WalletClaimUnavailableError,
} from './wallet-claim.service';
import { generateRedemptionCode } from './redemption-store.util';

// Minimal in-memory stand-in for the guest_wallet_claims table.
function fakeDb(initial: Record<string, string> = {}, failWith?: unknown) {
  const rows = new Map<string, string>(Object.entries(initial));
  return {
    rows,
    from() {
      return {
        select: () => ({
          in: async (_col: string, keys: string[]) =>
            failWith
              ? { data: null, error: failWith }
              : { data: keys.filter((k) => rows.has(k)).map((k) => ({ guest_key: k, secret_hash: rows.get(k)! })), error: null },
        }),
        upsert: async (list: Array<{ guest_key: string; secret_hash: string }>) => {
          for (const r of list) if (!rows.has(r.guest_key)) rows.set(r.guest_key, r.secret_hash);
          return { error: null };
        },
      };
    },
  };
}

const SECRET_A = 'a'.repeat(32);
const SECRET_B = 'b'.repeat(32);

describe('guest wallet claims', () => {
  it('claims an unclaimed identifier when sign-up asks for it, and keeps it for that secret', async () => {
    const db = fakeDb();
    const first = await authorizeGuestIdentifiers(db, ['@Rahul'], SECRET_A, { claim: true });
    expect(first.owned).toEqual(['@Rahul']);
    expect(db.rows.get('@rahul')).toBe(hashWalletSecret(SECRET_A));

    const again = await authorizeGuestIdentifiers(db, ['@rahul '], SECRET_A);
    expect(again.owned).toEqual(['@rahul ']);
  });

  it('a plain read never claims an unclaimed handle, so the first device to ask cannot take it', async () => {
    const db = fakeDb();
    const res = await authorizeGuestIdentifiers(db, ['@rahul'], SECRET_A);
    expect(res).toEqual({ owned: [], taken: [] });
    expect(db.rows.size).toBe(0);
  });

  it('does not authorize a different secret, and reports the handle as taken', async () => {
    const db = fakeDb({ '@rahul': hashWalletSecret(SECRET_A) });
    const res = await authorizeGuestIdentifiers(db, ['@rahul', '9876543210'], SECRET_B, { claim: true });
    expect(res.owned).toEqual(['9876543210']);
    expect(res.taken).toEqual(['@rahul']);
  });

  it('authorizes nothing without a secret', async () => {
    const db = fakeDb();
    expect(await authorizeGuestIdentifiers(db, ['@rahul'], null)).toEqual({ owned: [], taken: [] });
    expect(db.rows.size).toBe(0);
  });

  it('fails closed when the claims table cannot be read', async () => {
    const db = fakeDb({}, { message: 'relation does not exist' });
    await expect(authorizeGuestIdentifiers(db, ['@rahul'], SECRET_A)).rejects.toBeInstanceOf(WalletClaimUnavailableError);
  });

  it('validates the secret header format', () => {
    const ok = new Request('http://x', { headers: { 'x-guest-wallet-secret': SECRET_A } });
    const short = new Request('http://x', { headers: { 'x-guest-wallet-secret': 'short' } });
    const none = new Request('http://x');
    expect(readWalletSecret(ok)).toBe(SECRET_A);
    expect(readWalletSecret(short)).toBeNull();
    expect(readWalletSecret(none)).toBeNull();
  });

  it('normalizes case and whitespace', () => {
    expect(normalizeGuestKey('  @RaHuL ')).toBe('@rahul');
  });
});

describe('redemption codes', () => {
  it('are 6 random digits and not constant', () => {
    const codes = new Set(Array.from({ length: 50 }, generateRedemptionCode));
    Array.from(codes).forEach((c) => expect(c).toMatch(/^QC-RDM-\d{6}$/));
    expect(codes.size).toBeGreaterThan(40);
  });
});
