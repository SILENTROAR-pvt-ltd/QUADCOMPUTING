import { describe, it, expect } from 'vitest';
import { clubDb } from './fakes';
import { normalizePhoneE164, sendOtp, verifiedAt, verifyOtp } from '@/lib/club/otp/otp.service';
import { smsProvider } from '@/lib/club/otp/sms-providers';

const USER = '22222222-aaaa-4bbb-8ccc-000000000001';

function capture() {
  const sent: Array<{ phone: string; text: string }> = [];
  return { sent, provider: { name: 'test', async send(phone: string, text: string) { sent.push({ phone, text }); } } };
}
const codeOf = (text: string) => /(\d{6})/.exec(text)![1];

describe('Phone numbers', () => {
  it('a bare 10-digit Indian mobile gets +91; international numbers keep their code', () => {
    expect(normalizePhoneE164('98765 43210')).toBe('919876543210');
    expect(normalizePhoneE164('+91 98765-43210')).toBe('919876543210');
    expect(normalizePhoneE164('09876543210')).toBe('919876543210');
    expect(normalizePhoneE164('+44 7700 900123')).toBe('447700900123');
    expect(normalizePhoneE164('12345')).toBeNull();
  });
});

describe('SMS provider choice', () => {
  it('the console provider never runs in production', () => {
    expect(smsProvider({ NODE_ENV: 'development' })?.name).toBe('console');
    expect(smsProvider({ NODE_ENV: 'production', CLUB_SMS_PROVIDER: 'console' })).toBeNull();
    expect(smsProvider({ NODE_ENV: 'production', CLUB_SMS_PROVIDER: 'fast2sms' })?.name).toBe('fast2sms');
  });
});

describe('OTP verification', () => {
  it('the right code verifies the phone, and only that phone, for 30 minutes', async () => {
    const db = clubDb({ club_phone_otps: [] });
    const { sent, provider } = capture();
    const t0 = Date.parse('2026-10-11T10:00:00Z');
    await sendOtp(db, USER, '9876543210', provider, t0);
    expect(db.tables.club_phone_otps[0].code_hash).not.toContain(codeOf(sent[0].text));
    await verifyOtp(db, USER, '9876543210', codeOf(sent[0].text), t0 + 60_000);
    expect(await verifiedAt(db, USER, '919876543210', t0 + 5 * 60_000)).toBeTruthy();
    expect(await verifiedAt(db, USER, '919999999999', t0 + 5 * 60_000)).toBeNull();
    expect(await verifiedAt(db, USER, '919876543210', t0 + 40 * 60_000)).toBeNull();
  });

  it('wrong codes count, and after five the code is dead', async () => {
    const db = clubDb({ club_phone_otps: [] });
    const { sent, provider } = capture();
    const t0 = Date.now();
    await sendOtp(db, USER, '9876543210', provider, t0);
    for (let i = 0; i < 5; i++) await expect(verifyOtp(db, USER, '9876543210', '000000', t0)).rejects.toMatchObject({ status: 400 });
    await expect(verifyOtp(db, USER, '9876543210', codeOf(sent[0].text), t0)).rejects.toMatchObject({ status: 429 });
  });

  it('an expired code is refused', async () => {
    const db = clubDb({ club_phone_otps: [] });
    const { sent, provider } = capture();
    const t0 = Date.now();
    await sendOtp(db, USER, '9876543210', provider, t0);
    await expect(verifyOtp(db, USER, '9876543210', codeOf(sent[0].text), t0 + 11 * 60_000)).rejects.toMatchObject({ code: 'expired' });
  });

  it('resends are throttled, and nothing is sent without a provider', async () => {
    const db = clubDb({ club_phone_otps: [] });
    const { provider } = capture();
    const t0 = Date.now();
    await sendOtp(db, USER, '9876543210', provider, t0);
    await expect(sendOtp(db, USER, '9876543210', provider, t0 + 10_000)).rejects.toMatchObject({ status: 429 });
    await expect(sendOtp(db, USER, '9876543210', null, t0 + 60_000)).rejects.toMatchObject({ status: 503 });
  });

  it('a failed SMS leaves no usable code behind', async () => {
    const db = clubDb({ club_phone_otps: [] });
    const broken = { name: 'broken', async send() { throw new Error('down'); } };
    await expect(sendOtp(db, USER, '9876543210', broken)).rejects.toMatchObject({ status: 502 });
    expect(db.tables.club_phone_otps).toHaveLength(0);
  });
});
