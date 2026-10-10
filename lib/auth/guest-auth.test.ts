import { describe, it, expect } from 'vitest';
import {
  GUEST_SESSION_COOKIE,
  hashPin,
  hashSessionToken,
  isValidPin,
  newSessionToken,
  nextFailureState,
  normalizeDisplayName,
  normalizeHandle,
  normalizePhone,
  pinLockState,
  readSessionCookie,
  sessionCookie,
  verifyPin,
  PIN_LOCK_THRESHOLD,
} from './guest-auth';

describe('guest handles', () => {
  it('stores handles as @ + lowercase letters, digits and underscores', () => {
    expect(normalizeHandle('Harsh_1224')).toBe('@harsh_1224');
    expect(normalizeHandle('@@Rahul')).toBe('@rahul');
    expect(normalizeHandle('  bom-bay!! ')).toBe('@bombay');
  });

  it('rejects handles that are too short or too long after cleaning', () => {
    expect(normalizeHandle('a')).toBeNull();
    expect(normalizeHandle('!!!')).toBeNull();
    expect(normalizeHandle('x'.repeat(31))).toBeNull();
    expect(normalizeHandle(42)).toBeNull();
  });
});

describe('guest PIN', () => {
  it('accepts exactly six digits', () => {
    expect(isValidPin('123456')).toBe(true);
    expect(isValidPin('12345')).toBe(false);
    expect(isValidPin('1234567')).toBe(false);
    expect(isValidPin('12a456')).toBe(false);
    expect(isValidPin(123456)).toBe(false);
  });

  it('verifies the right PIN and rejects a wrong one', async () => {
    const stored = await hashPin('482915');
    expect(stored.hash).not.toContain('482915');
    expect(await verifyPin('482915', stored)).toBe(true);
    expect(await verifyPin('482916', stored)).toBe(false);
  });

  it('salts every hash, so equal PINs do not share a stored value', async () => {
    const a = await hashPin('000000');
    const b = await hashPin('000000');
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });
});

describe('guest contact details', () => {
  it('keeps only digits for phone numbers and checks their length', () => {
    expect(normalizePhone('+91 98765-43210')).toBe('919876543210');
    expect(normalizePhone('12345')).toBeNull();
  });

  it('strips markup from display names', () => {
    // Angle brackets are removed so a name can never carry markup into the chat.
    expect(normalizeDisplayName('  <b>Asha</b> ')).toBe('bAsha/b');
    expect(normalizeDisplayName('   ')).toBeNull();
  });
});

describe('guest session cookie', () => {
  it('reads only its own cookie and rejects malformed values', () => {
    const token = newSessionToken();
    const header = `theme=dark; ${GUEST_SESSION_COOKIE}=${token}; other=1`;
    expect(readSessionCookie(header)).toBe(token);
    expect(readSessionCookie('theme=dark')).toBeNull();
    expect(readSessionCookie(`${GUEST_SESSION_COOKIE}=short`)).toBeNull();
    expect(readSessionCookie(null)).toBeNull();
  });

  it('issues httpOnly, SameSite=Lax cookies and clears them on logout', () => {
    const set = sessionCookie('abc'.repeat(12));
    expect(set).toContain('HttpOnly');
    expect(set).toContain('SameSite=Lax');
    expect(set).toContain('Path=/');
    const cleared = sessionCookie(null);
    expect(cleared).toContain('Max-Age=0');
    expect(cleared).toContain(`${GUEST_SESSION_COOKIE}=;`);
  });

  it('stores only a hash of the session token, never the token itself', () => {
    const token = newSessionToken();
    const hash = hashSessionToken(token);
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain(token);
    expect(hashSessionToken(token)).toBe(hash);
  });
});

describe('PIN lockout', () => {
  const now = new Date('2026-10-08T12:00:00Z');

  it('locks after the threshold of wrong PINs, then resets the counter', () => {
    let state = { failed_attempts: 0, locked_until: null as string | null };
    for (let i = 1; i < PIN_LOCK_THRESHOLD; i++) {
      state = { ...state, ...nextFailureState(state.failed_attempts, now) };
      expect(state.locked_until).toBeNull();
    }
    state = { ...state, ...nextFailureState(state.failed_attempts, now) };
    expect(state.locked_until).not.toBeNull();
    expect(state.failed_attempts).toBe(0);
  });

  it('reports the remaining lock time and releases once it has passed', () => {
    const until = new Date(now.getTime() + 10 * 60_000).toISOString();
    expect(pinLockState(until, now)).toEqual({ locked: true, retryAfterSeconds: 600 });
    expect(pinLockState(until, new Date(now.getTime() + 11 * 60_000))).toEqual({ locked: false, retryAfterSeconds: 0 });
    expect(pinLockState(null, now).locked).toBe(false);
  });
});
