import { asStaffRole, type StaffRole } from './staff-roles';

/**
 * The staff sign-in cookie: a small signed token, `base64url(payload).base64url(HMAC-SHA256)`. Web Crypto only, so the
 * middleware (edge runtime) and the API routes (node) read it the same way. The payload carries who, which venue, which
 * role and when it ends; nothing in it is secret, and changing any of it breaks the signature.
 */
export const STAFF_COOKIE = 'qc_staff_session';
/** One shift: a staff member signs in again the next day. */
export const STAFF_SESSION_SECONDS = 12 * 60 * 60;

export interface StaffSession {
  /** staff_profiles.id */
  sid: string;
  /** businesses.id */
  bid: string;
  role: StaffRole;
  name: string;
  /** Expiry, seconds since the epoch. */
  exp: number;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64url(bytes: Uint8Array): string {
  let s = '';
  bytes.forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64url(text: string): Uint8Array {
  const pad = text.length % 4 === 0 ? '' : '='.repeat(4 - (text.length % 4));
  const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/') + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** The signing secret: its own variable when set, otherwise derived from the service key. Null disables staff sign-in. */
export function staffSecret(): string | null {
  return process.env.STAFF_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}

async function hmac(secret: string, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(`qc-staff-session-v1:${secret}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(message)));
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function signStaffSession(session: StaffSession, secret: string): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify(session)));
  return `${body}.${b64url(await hmac(secret, body))}`;
}

/** The session the token carries, or null when it is missing, forged, malformed or past its end. */
export async function readStaffSession(token: string | undefined | null, secret: string | null, nowSeconds = Math.floor(Date.now() / 1000)): Promise<StaffSession | null> {
  if (!token || !secret) return null;
  const [body, sig, extra] = token.split('.');
  if (!body || !sig || extra !== undefined) return null;
  try {
    if (!sameBytes(await hmac(secret, body), fromB64url(sig))) return null;
    const raw = JSON.parse(dec.decode(fromB64url(body)));
    const role = asStaffRole(raw?.role);
    if (!role || typeof raw.sid !== 'string' || typeof raw.bid !== 'string' || typeof raw.exp !== 'number') return null;
    if (raw.exp <= nowSeconds) return null;
    return { sid: raw.sid, bid: raw.bid, role, name: String(raw.name ?? ''), exp: raw.exp };
  } catch {
    return null;
  }
}

/** The staff token from a Cookie header, if there is one. */
export function staffTokenFromCookieHeader(header: string | null | undefined): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === STAFF_COOKIE) return rest.join('=') || null;
  }
  return null;
}
