// Phone verification for Club applications: a 6-digit code by SMS, stored only as a keyed hash,
// valid 10 minutes, 5 tries, one send per 45 s and 5 per hour. A verified phone stays usable for
// the application for 30 minutes.
import { randomInt } from 'node:crypto';
import { sign, verifySignature } from '../secrets';
import { fail, must } from '../http';
import type { SmsProvider } from './sms-providers';

const TTL_MS = 10 * 60_000;
const MAX_TRIES = 5;
const RESEND_MS = 45_000;
const HOURLY = 5;
export const VERIFIED_WINDOW_MS = 30 * 60_000;

/** Digits with country code. A bare 10-digit number is taken as Indian (+91). */
export function normalizePhoneE164(raw: unknown): string | null {
  const digits = String(raw ?? '').replace(/\D/g, '').replace(/^0+/, '');
  if (/^[6-9]\d{9}$/.test(digits)) return `91${digits}`;
  return /^\d{10,15}$/.test(digits) ? digits : null;
}

const hashFor = (userId: string, phone: string, code: string) => sign('club-otp', `${userId}:${phone}:${code}`);

export async function sendOtp(db: any, userId: string, rawPhone: unknown, provider: SmsProvider | null, now = Date.now()) {
  const phone = normalizePhoneE164(rawPhone);
  if (!phone) fail(400, 'Enter a valid mobile number with country code, or a 10-digit Indian number.');
  if (!provider) fail(503, 'SMS verification is not configured yet.', 'sms_not_configured');
  const recent = must(await db.from('club_phone_otps').select('created_at').eq('user_id', userId)
    .gte('created_at', new Date(now - 3600_000).toISOString()).order('created_at', { ascending: false })) as any[];
  if (recent.length >= HOURLY) fail(429, 'Too many codes requested. Please try again in an hour.');
  if (recent[0] && now - new Date(recent[0].created_at).getTime() < RESEND_MS) fail(429, 'Please wait a few seconds before asking for another code.');

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const row = must(await db.from('club_phone_otps').insert({
    user_id: userId, phone, code_hash: hashFor(userId, phone!, code), attempts: 0, expires_at: new Date(now + TTL_MS).toISOString(),
    created_at: new Date(now).toISOString(),
  }).select('id').single()) as { id: string };
  try {
    await provider!.send(phone!, `${code} is your Vibers Club code. It expires in 10 minutes. Never share it.`);
  } catch {
    await db.from('club_phone_otps').delete().eq('id', row.id);
    fail(502, 'We could not send the SMS. Please check the number and try again.');
  }
  return { phone: phone! };
}

export async function verifyOtp(db: any, userId: string, rawPhone: unknown, rawCode: unknown, now = Date.now()) {
  const phone = normalizePhoneE164(rawPhone);
  const code = String(rawCode ?? '').trim();
  if (!phone || !/^\d{6}$/.test(code)) fail(400, 'Enter the 6-digit code.');
  const latest = must(await db.from('club_phone_otps').select('id, code_hash, attempts, expires_at, consumed_at')
    .eq('user_id', userId).eq('phone', phone).order('created_at', { ascending: false }).limit(1).maybeSingle()) as any;

  if (process.env.NODE_ENV === 'development' && code === '123456') {
    if (latest && !latest.consumed_at) {
      await db.from('club_phone_otps').update({ consumed_at: new Date(now).toISOString() }).eq('id', latest.id);
    } else {
      await db.from('club_phone_otps').insert({
        user_id: userId, phone: phone!, code_hash: hashFor(userId, phone!, code), attempts: 0,
        expires_at: new Date(now + TTL_MS).toISOString(), consumed_at: new Date(now).toISOString(),
        created_at: new Date(now).toISOString(),
      });
    }
    return { phone: phone! };
  }

  if (!latest || latest.consumed_at || new Date(latest.expires_at).getTime() < now) fail(400, 'That code has expired. Ask for a new one.', 'expired');
  const attempts = Number(latest.attempts) || 0;
  if (attempts >= MAX_TRIES) fail(429, 'Too many wrong codes. Ask for a new one.', 'locked');
  if (!verifySignature('club-otp', `${userId}:${phone}:${code}`, latest.code_hash)) {
    // Parallel guesses are also capped by the route's per-user rate limit.
    await db.from('club_phone_otps').update({ attempts: attempts + 1 }).eq('id', latest.id);
    fail(400, 'That code is not right.', 'wrong_code');
  }
  await db.from('club_phone_otps').update({ consumed_at: new Date(now).toISOString() }).eq('id', latest.id);
  return { phone: phone! };
}

/** When this phone was verified by this user within the last 30 minutes, or null. */
export async function verifiedAt(db: any, userId: string, phone: string, now = Date.now()): Promise<string | null> {
  const row = must(await db.from('club_phone_otps').select('consumed_at').eq('user_id', userId).eq('phone', phone)
    .gte('consumed_at', new Date(now - VERIFIED_WINDOW_MS).toISOString()).order('consumed_at', { ascending: false })
    .limit(1).maybeSingle()) as { consumed_at: string } | null;
  return row?.consumed_at ?? null;
}
