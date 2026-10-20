import { createHmac, timingSafeEqual } from 'crypto';

/**
 * The master-PIN unlock, held by the server. A correct master PIN sets a short-lived, HttpOnly, signed cookie bound to
 * the owner and the venue. Sections the master PIN locks (bank and UPI details) check this cookie, so the unlock is no
 * longer a flag a browser can set. The payload is not secret; changing any of it breaks the signature.
 */
export const MASTER_UNLOCK_COOKIE = 'qc_master_unlock';
export const MASTER_UNLOCK_SECONDS = 15 * 60;

function signingSecret(): string | null {
  return process.env.STAFF_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}

function sign(body: string, secret: string): string {
  return createHmac('sha256', `qc-master-unlock-v1:${secret}`).update(body).digest('base64url');
}

/** A new unlock token for this owner and venue, or null when no signing secret is configured. */
export function issueMasterUnlock(userId: string, businessId: string, nowSeconds = Math.floor(Date.now() / 1000)): string | null {
  const secret = signingSecret();
  if (!secret) return null;
  const body = Buffer.from(JSON.stringify({ uid: userId, bid: businessId, exp: nowSeconds + MASTER_UNLOCK_SECONDS })).toString('base64url');
  return `${body}.${sign(body, secret)}`;
}

/** Whether the token is a valid, unexpired unlock for this owner and venue. */
export function hasMasterUnlock(token: string | null | undefined, userId: string, businessId: string, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  const secret = signingSecret();
  if (!secret || !token) return false;
  const [body, sig, extra] = token.split('.');
  if (!body || !sig || extra !== undefined) return false;
  const expected = Buffer.from(sign(body, secret));
  const got = Buffer.from(sig);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return false;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return p.uid === userId && p.bid === businessId && typeof p.exp === 'number' && p.exp > nowSeconds;
  } catch {
    return false;
  }
}

/** The unlock token from a Cookie header, if there is one. */
export function masterUnlockFromCookieHeader(header: string | null | undefined): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === MASTER_UNLOCK_COOKIE) return rest.join('=') || null;
  }
  return null;
}
