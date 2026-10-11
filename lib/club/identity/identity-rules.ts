// Identity rules for Club applications: age gate, generation tag, Viber ID and alias checks.
import { normalizeHandle } from '@/lib/auth/guest-auth';
import { containsProfanity } from './profanity';
import type { Generation } from '../types';

export const MIN_AGE = 18;

/** Whole years between a YYYY-MM-DD birth date and `now`, or null for an invalid date. */
export function ageOn(dob: string, now: Date = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob || '');
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const birth = new Date(Date.UTC(y, mo - 1, d));
  if (birth.getUTCFullYear() !== y || birth.getUTCMonth() !== mo - 1 || birth.getUTCDate() !== d) return null;
  if (birth.getTime() > now.getTime() || y < 1900) return null;
  let age = now.getUTCFullYear() - y;
  if (now.getUTCMonth() < mo - 1 || (now.getUTCMonth() === mo - 1 && now.getUTCDate() < d)) age -= 1;
  return age;
}

/** Generation from birth year. Shown publicly instead of the age, which never is. */
export function generationOf(dob: string): Generation {
  const year = Number(dob.slice(0, 4));
  if (year >= 2013) return 'gen_alpha';
  if (year >= 1997) return 'gen_z';
  if (year >= 1981) return 'millennial';
  if (year >= 1965) return 'gen_x';
  return 'boomer';
}

export const GENERATION_LABEL: Record<Generation, string> = {
  gen_alpha: 'Gen Alpha', gen_z: 'Gen Z', millennial: 'Millennial', gen_x: 'Gen X', boomer: 'Boomer',
};

const RESERVED = new Set([
  'admin', 'administrator', 'root', 'support', 'help', 'helpdesk', 'vibers', 'viber', 'vibersclub', 'vibersconnect',
  'club', 'official', 'moderator', 'mod', 'mods', 'staff', 'system', 'quad', 'quadcomputing', 'null', 'undefined',
  'me', 'team', 'security', 'payments', 'billing', 'owner', 'superadmin', 'everyone', 'here',
]);

/** The Viber ID is the shared Vibers @handle: 2–30 lowercase letters, digits or underscores. */
export function checkViberId(raw: unknown): { ok: true; viberId: string } | { ok: false; error: string } {
  const handle = normalizeHandle(raw);
  if (!handle || handle.slice(1) !== String(raw).trim().replace(/^@+/, '').toLowerCase()) {
    return { ok: false, error: 'Use 2–30 letters, numbers or underscores for your Viber ID.' };
  }
  const body = handle.slice(1);
  if (RESERVED.has(body) || RESERVED.has(body.replace(/_/g, ''))) return { ok: false, error: 'That Viber ID is reserved. Please choose another.' };
  if (containsProfanity(body)) return { ok: false, error: 'Please choose a different Viber ID.' };
  return { ok: true, viberId: handle };
}

/** Masked club name: 2–30 characters, no profanity, no @ (so it can't pose as a Viber ID). */
export function checkAlias(raw: unknown): { ok: true; alias: string | null } | { ok: false; error: string } {
  if (raw == null || String(raw).trim() === '') return { ok: true, alias: null };
  const alias = String(raw).replace(/[\u0000-\u001f<>@]/g, '').trim().slice(0, 30);
  if (alias.length < 2) return { ok: false, error: 'Your club name needs at least 2 characters.' };
  if (containsProfanity(alias)) return { ok: false, error: 'Please choose a different club name.' };
  return { ok: true, alias };
}

export function cleanText(raw: unknown, max: number): string | null {
  if (typeof raw !== 'string') return null;
  const text = raw.replace(/[\u0000-\u0008\u000b-\u001f<>]/g, '').trim().slice(0, max);
  return text.length ? text : null;
}
