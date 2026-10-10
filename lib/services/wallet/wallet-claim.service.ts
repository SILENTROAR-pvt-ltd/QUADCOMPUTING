import { createHash, timingSafeEqual } from 'node:crypto';

/** Header carrying the guest browser's wallet secret. */
export const WALLET_SECRET_HEADER = 'x-guest-wallet-secret';

const SECRET_FORMAT = /^[A-Za-z0-9_-]{16,128}$/;

/** Claims are case/whitespace-insensitive ("@Rahul" and "@rahul " are the same wallet owner). */
export function normalizeGuestKey(id: string): string {
  return id.trim().toLowerCase();
}

/** @handles are stored lowercase (the UI lowercases them), so lookups must use the same form. */
export function canonicalGuestId(id: string): string {
  const trimmed = id.trim();
  return trimmed.startsWith('@') ? trimmed.toLowerCase() : trimmed;
}

export function hashWalletSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

export function readWalletSecret(request: Request): string | null {
  const raw = request.headers.get(WALLET_SECRET_HEADER)?.trim();
  return raw && SECRET_FORMAT.test(raw) ? raw : null;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export class WalletClaimUnavailableError extends Error {
  readonly status = 503;
  constructor(cause?: unknown) {
    super('Wallet verification is temporarily unavailable');
    this.name = 'WalletClaimUnavailableError';
    (this as { cause?: unknown }).cause = cause;
  }
}

/**
 * Returns the subset of `identifiers` the caller proved ownership of.
 *  - no/invalid secret            -> nothing is authorized
 *  - claimed with this secret     -> owned
 *  - claimed by another secret    -> not owned, and reported as taken
 *  - never claimed                -> not owned and not taken. It is claimed only when the caller
 *                                    passes `claim: true`, which sign-up does. A read never claims,
 *                                    so the first device to ask for a handle can't take it.
 * Names are never valid identifiers: they are not unique, so they can't be owned.
 */
export interface ClaimResult {
  /** Identifiers the caller proved ownership of. */
  owned: string[];
  /** Identifiers already claimed by someone else (e.g. a handle another guest picked first). */
  taken: string[];
}

export async function authorizeGuestIdentifiers(
  db: any,
  identifiers: Array<string | null | undefined>,
  secret: string | null,
  options: { claim?: boolean } = {}
): Promise<ClaimResult> {
  if (!secret) return { owned: [], taken: [] };

  const byKey = new Map<string, string>();
  for (const id of identifiers) {
    if (typeof id !== 'string') continue;
    const key = normalizeGuestKey(id);
    if (key && key.length <= 128 && !byKey.has(key)) byKey.set(key, id);
  }
  if (byKey.size === 0) return { owned: [], taken: [] };

  const keys = Array.from(byKey.keys());
  const hash = hashWalletSecret(secret);

  try {
    const read = () => db.from('guest_wallet_claims').select('guest_key, secret_hash').in('guest_key', keys);
    let { data: claims, error } = await read();
    if (error) throw error;

    const claimed = new Set<string>((claims || []).map((c: any) => c.guest_key));
    const unclaimed = keys.filter((k) => !claimed.has(k));
    if (options.claim && unclaimed.length > 0) {
      const { error: insertError } = await db
        .from('guest_wallet_claims')
        .upsert(unclaimed.map((guest_key) => ({ guest_key, secret_hash: hash })), { onConflict: 'guest_key', ignoreDuplicates: true });
      if (insertError) throw insertError;
      ({ data: claims, error } = await read());
      if (error) throw error;
    }

    const claimedNow = new Set<string>((claims || []).map((c: any) => c.guest_key));
    const owned = new Set<string>(
      (claims || []).filter((c: any) => safeEqual(String(c.secret_hash), hash)).map((c: any) => c.guest_key)
    );
    return {
      owned: keys.filter((k) => owned.has(k)).map((k) => byKey.get(k)!),
      // Taken means claimed by someone else. A never-claimed identifier is neither owned nor taken.
      taken: keys.filter((k) => claimedNow.has(k) && !owned.has(k)).map((k) => byKey.get(k)!),
    };
  } catch (err) {
    console.error('[WalletClaims] verification failed:', (err as any)?.message || err);
    throw new WalletClaimUnavailableError(err);
  }
}
