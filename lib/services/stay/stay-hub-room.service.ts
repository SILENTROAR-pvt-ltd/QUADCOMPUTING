import { hasRoomSession, roomSessionFromCookieHeader } from './room-session';
import { stayStartedAt } from './room-access.service';
import { ensureRoomCode } from './room-route.util';

// The room this phone is confirmed in right now, and what the venue has to offer: read by the menu's Stay tile.

export interface MyRoom { code: string; room_number: string; room_type: string | null; check_out: string | null }

/** The occupied room this browser holds a live session for, if any: the room the guest confirmed with their phone digits. */
export async function findMyRoom(db: any, businessId: string, cookieHeader: string | null | undefined): Promise<MyRoom | null> {
  if (!cookieHeader) return null;
  const { data: rooms, error } = await db.from('rooms')
    .select('id, business_id, category_id, room_number, status, check_in_time, check_in_date, check_out_time, check_out_date, qr_code_hash, category:room_categories(name)')
    .eq('business_id', businessId).eq('status', 'OCCUPIED');
  if (error) throw error;
  for (const r of rooms || []) {
    const token = roomSessionFromCookieHeader(cookieHeader, r.id);
    if (token && hasRoomSession(token, r.id, businessId, stayStartedAt(r))) {
      return { code: await ensureRoomCode(db, r), room_number: r.room_number, room_type: r.category?.name || null, check_out: r.check_out_time || r.check_out_date || null };
    }
  }
  return null;
}

/** What the venue offers, for the tile: whether it has rooms at all, the lowest rate, and how many rooms are free right now. */
export async function venueStaySummary(db: any, businessId: string): Promise<{ has_rooms: boolean; from_price: number | null; free_now: number }> {
  const [{ data: cats, error: catErr }, { data: rooms, error: roomErr }] = await Promise.all([
    db.from('room_categories').select('price').eq('business_id', businessId),
    db.from('rooms').select('status').eq('business_id', businessId),
  ]);
  if (catErr) throw catErr;
  if (roomErr) throw roomErr;
  const prices = (cats || []).map((c: any) => Number(c.price) || 0).filter((p: number) => p > 0);
  return {
    has_rooms: (rooms || []).length > 0,
    from_price: prices.length ? Math.min(...prices) : null,
    free_now: (rooms || []).filter((r: any) => String(r.status || '').toUpperCase() === 'VACANT').length,
  };
}
