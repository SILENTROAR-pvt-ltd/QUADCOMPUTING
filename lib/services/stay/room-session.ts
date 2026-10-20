import { createHmac, timingSafeEqual } from 'crypto';
import { signingSecret } from '@/lib/services/security/master-unlock';

/**
 * A guest's proof that they are the room's current guest, held by the server as a signed, HttpOnly cookie. It is
 * issued at self check-in, or when the guest confirms the last four digits of the phone given at the desk. It is
 * bound to the room, the venue and the stay's check-in time, so it stops working the moment a new stay begins.
 */
export const ROOM_SESSION_SECONDS = 30 * 24 * 60 * 60;

export const roomCookieName = (roomId: string) => `qc_room_${roomId.replace(/-/g, '').slice(0, 12)}`;

function sign(body: string, secret: string): string {
  return createHmac('sha256', `qc-room-session-v1:${secret}`).update(body).digest('base64url');
}

export function issueRoomSession(roomId: string, businessId: string, stayStartedAt: string, nowSeconds = Math.floor(Date.now() / 1000)): string | null {
  const secret = signingSecret();
  if (!secret) return null;
  const body = Buffer.from(JSON.stringify({ rid: roomId, bid: businessId, sa: stayStartedAt, exp: nowSeconds + ROOM_SESSION_SECONDS })).toString('base64url');
  return `${body}.${sign(body, secret)}`;
}

export function hasRoomSession(token: string | null | undefined, roomId: string, businessId: string, stayStartedAt: string | null, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  const secret = signingSecret();
  if (!secret || !token || !stayStartedAt) return false;
  const [body, sig, extra] = token.split('.');
  if (!body || !sig || extra !== undefined) return false;
  const expected = Buffer.from(sign(body, secret));
  const got = Buffer.from(sig);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return false;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return p.rid === roomId && p.bid === businessId && p.sa === stayStartedAt && typeof p.exp === 'number' && p.exp > nowSeconds;
  } catch {
    return false;
  }
}

export function roomSessionFromCookieHeader(header: string | null | undefined, roomId: string): string | null {
  if (!header) return null;
  const name = roomCookieName(roomId);
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=') || null;
  }
  return null;
}

export const roomCookieOptions = {
  httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: ROOM_SESSION_SECONDS,
};
