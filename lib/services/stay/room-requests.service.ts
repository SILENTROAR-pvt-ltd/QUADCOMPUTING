// What a room's guest has asked the desk for during the current stay: housekeeping, towels, water, "call the room", a
// note of their own, a check-out or a payment request. Each is a staff call the room page sends (table_number
// "ROOM <n>"), so this reads them back, newest first, waiting or done. The desk's folio and the guest's room page both
// show this list, so they always agree on what was asked and what has been handled.

export type RoomRequestKind = 'service' | 'waiter' | 'bill' | 'other';
export interface RoomRequestItem { id: string; kind: RoomRequestKind; message: string | null; status: 'waiting' | 'done'; at: string }

const KIND: Record<string, RoomRequestKind> = { SERVICE: 'service', WAITER: 'waiter', BILL: 'bill' };
const DAY_MS = 86_400_000;

/** How a room's calls are labelled ("ROOM 204"), the same label the bell reads the room from. */
export const roomCallLabel = (roomNumber: string) => `ROOM ${String(roomNumber).trim()}`;

/** Where the current stay began: the check-in time (a minute's margin), or a day back for a room record without one. */
export function stayStartIso(room: { check_in_time?: string | null; check_in_date?: string | null }, now = Date.now()): string {
  const at = Date.parse(String(room.check_in_time || room.check_in_date || ''));
  return new Date(Number.isNaN(at) ? now - DAY_MS : at - 60_000).toISOString();
}

/** The current stay's requests for this room, newest first. An earlier guest's requests never show. */
export async function roomRequests(
  db: any, businessId: string, room: { room_number?: string | null; check_in_time?: string | null; check_in_date?: string | null },
  now = Date.now(), limit = 30,
): Promise<RoomRequestItem[]> {
  if (!room?.room_number) return [];
  const { data, error } = await db.from('staff_notifications')
    .select('id, notification_type, message, status, created_at')
    .eq('business_id', businessId).eq('table_number', roomCallLabel(room.room_number))
    .gte('created_at', stayStartIso(room, now))
    .order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data || []).map((n: any): RoomRequestItem => ({
    id: String(n.id), kind: KIND[String(n.notification_type)] || 'other', message: n.message ?? null,
    status: n.status === 'PENDING' ? 'waiting' : 'done', at: String(n.created_at),
  }));
}
