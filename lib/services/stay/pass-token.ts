import { createHash, createHmac } from 'crypto';
import { signingSecret } from '@/lib/services/security/master-unlock';

// A stay pass's link token. It is derived, not random and stored: HMAC(server secret, pass id, version). The desk can
// therefore show the same link again, bumping the version revokes every old link, and the database holds only a hash
// of the token, used to find the pass.

export function passToken(passId: string, version: number): string {
  const secret = signingSecret();
  if (!secret) throw new Error('No signing secret is configured for stay passes.');
  return createHmac('sha256', `qc-stay-pass-v1:${secret}`).update(`${passId}|${version}`).digest('base64url');
}

export const hashPassToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** A token as it arrives in a URL or body: only the characters the derivation can produce, and a sane length. */
export const looksLikePassToken = (t: unknown): t is string => typeof t === 'string' && /^[A-Za-z0-9_-]{43}$/.test(t);
