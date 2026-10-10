import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

// Pure guest-auth helpers (no I/O) so the rules can be unit-tested directly.
// Database work lives in lib/services/guest-auth/guest-account.service.ts.

const scrypt = promisify(scryptCb) as (password: string, salt: string, keylen: number) => Promise<Buffer>;

export const GUEST_SESSION_COOKIE = 'vc_guest_session';
export const GUEST_SESSION_TTL_DAYS = 30;
export const PIN_LOCK_THRESHOLD = 5;
export const PIN_LOCK_MINUTES = 15;

/**
 * Handles are the guest's public name and wallet key: "@" + 2-30 lowercase
 * letters, digits or underscores. Anything else is cleaned or rejected.
 */
export function normalizeHandle(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const body = raw.trim().replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (body.length < 2 || body.length > 30) return null;
  return `@${body}`;
}

export function isValidPin(pin: unknown): pin is string {
  return typeof pin === 'string' && /^\d{6}$/.test(pin);
}

export function normalizeDisplayName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 60);
  return name.length >= 1 ? name : null;
}

export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

export interface PinHash {
  hash: string;
  salt: string;
}

export async function hashPin(pin: string): Promise<PinHash> {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(pin, salt, 32);
  return { hash: key.toString('hex'), salt };
}

export async function verifyPin(pin: string, stored: PinHash): Promise<boolean> {
  const key = await scrypt(pin, stored.salt, 32);
  const expected = Buffer.from(stored.hash, 'hex');
  return expected.length === key.length && timingSafeEqual(expected, key);
}

export function newSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Pulls the guest session token out of a Cookie header, if present. */
export function readSessionCookie(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() === GUEST_SESSION_COOKIE) {
      const value = part.slice(idx + 1).trim();
      return /^[A-Za-z0-9_-]{20,200}$/.test(value) ? value : null;
    }
  }
  return null;
}

export function sessionCookie(token: string | null): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  if (!token) {
    return `${GUEST_SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`;
  }
  const maxAge = GUEST_SESSION_TTL_DAYS * 24 * 60 * 60;
  return `${GUEST_SESSION_COOKIE}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

export interface PinLockState {
  locked: boolean;
  retryAfterSeconds: number;
}

/** Whether an account is in its lockout window after too many wrong PINs. */
export function pinLockState(lockedUntil: string | Date | null | undefined, now: Date = new Date()): PinLockState {
  if (!lockedUntil) return { locked: false, retryAfterSeconds: 0 };
  const until = new Date(lockedUntil).getTime();
  if (Number.isNaN(until) || until <= now.getTime()) return { locked: false, retryAfterSeconds: 0 };
  return { locked: true, retryAfterSeconds: Math.ceil((until - now.getTime()) / 1000) };
}

/** Failure bookkeeping: returns the next counter and lock time after a wrong PIN. */
export function nextFailureState(failedAttempts: number, now: Date = new Date()) {
  const attempts = failedAttempts + 1;
  if (attempts >= PIN_LOCK_THRESHOLD) {
    return {
      failed_attempts: 0,
      locked_until: new Date(now.getTime() + PIN_LOCK_MINUTES * 60_000).toISOString(),
    };
  }
  return { failed_attempts: attempts, locked_until: null };
}
