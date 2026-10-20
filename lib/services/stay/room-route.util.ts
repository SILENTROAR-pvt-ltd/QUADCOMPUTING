import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { hasRoomSession, roomSessionFromCookieHeader } from './room-session';
import { loadRoomByCode, stayStartedAt, type RoomStay } from './room-access.service';

// What every in-room route starts from: the stay behind the code on the QR card, and whether this browser has
// proved it belongs to the current guest.

export type RoomContext =
  | { ok: true; db: any; stay: RoomStay; verified: boolean }
  | { ok: false; response: NextResponse };

export async function roomContext(request: Request, code: string): Promise<RoomContext> {
  const db = adminDb();
  const stay = await loadRoomByCode(db, code);
  if (!stay) return { ok: false, response: NextResponse.json({ success: false, error: 'This room link is not valid.', code: 'ROOM_NOT_FOUND' }, { status: 404 }) };
  const token = roomSessionFromCookieHeader(request.headers.get('cookie'), stay.room.id);
  const verified = hasRoomSession(token, stay.room.id, stay.business.id, stayStartedAt(stay.room));
  return { ok: true, db, stay, verified };
}

export const notVerified = () =>
  NextResponse.json({ success: false, error: 'Confirm the phone number given at check-in first.', code: 'ROOM_NOT_VERIFIED' }, { status: 401 });

export const noStay = () =>
  NextResponse.json({ success: false, error: 'There is no stay checked in to this room right now.', code: 'ROOM_NOT_OCCUPIED' }, { status: 409 });

/** The columns the stay pages need from the venue, with the switches the owner controls. */
export const STAY_BUSINESS_SELECT =
  'id, business_name, name, slug, categories, menu_info, stay_tagline, checkin_time, checkout_time, self_checkin_enabled, in_room_dining_enabled, reservations_enabled';

export async function loadStayBusiness(db: any, businessId: string) {
  const { data, error } = await db.from('businesses').select(STAY_BUSINESS_SELECT).eq('id', businessId).maybeSingle();
  if (error) throw error;
  return data;
}

/** Older rooms were created without a QR code; the in-room link needs one, so it is minted on first use. */
export async function ensureRoomCode(db: any, room: { id: string; business_id: string; category_id?: string | null; room_number: string; qr_code_hash?: string | null }): Promise<string> {
  if (room.qr_code_hash) return room.qr_code_hash;
  const code = `ROOM_${String(room.category_id || room.business_id).slice(0, 8)}_${room.room_number}_${Date.now().toString(36)}`.replace(/[^A-Za-z0-9_-]/g, '');
  const { error } = await db.from('rooms').update({ qr_code_hash: code }).eq('id', room.id).eq('business_id', room.business_id).is('qr_code_hash', null);
  if (error) throw error;
  const { data } = await db.from('rooms').select('qr_code_hash').eq('id', room.id).maybeSingle();
  return data?.qr_code_hash || code;
}

/** "HH:MM" from the venue's stored check-out hour, or the default. */
export const checkoutHour = (value: unknown, fallback = '11:00') =>
  typeof value === 'string' && /^\d{2}:\d{2}/.test(value) ? value.slice(0, 5) : fallback;
