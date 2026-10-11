import { createHmac, timingSafeEqual } from 'node:crypto';

// One server-only secret for Club signatures (OTP hashes, NOC certificates). CLUB_SIGNING_SECRET is
// preferred; without it a key is derived from the service-role key so nothing is ever unsigned.
function signingKey(): string {
  const own = process.env.CLUB_SIGNING_SECRET;
  if (own && own.length >= 16) return own;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!service) throw new Error('[club] No signing secret: set CLUB_SIGNING_SECRET.');
  return createHmac('sha256', service).update('vibers-club-signing-v1').digest('hex');
}

export function sign(purpose: string, value: string): string {
  return createHmac('sha256', signingKey()).update(`${purpose}:${value}`).digest('hex');
}

export function verifySignature(purpose: string, value: string, signature: string): boolean {
  const expected = Buffer.from(sign(purpose, value), 'hex');
  const given = Buffer.from(String(signature || ''), 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Constant-time comparison of two hex HMACs (gateway signatures). */
export function hmacMatches(secret: string, payload: string, signature: string): boolean {
  const expected = Buffer.from(createHmac('sha256', secret).update(payload).digest('hex'), 'hex');
  const given = Buffer.from(String(signature || ''), 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}
