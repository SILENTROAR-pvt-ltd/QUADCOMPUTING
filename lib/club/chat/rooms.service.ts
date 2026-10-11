// Chat rooms: the global club chat (every approved member), 1:1 direct messages, and one discussion
// room per event (its creator, interested members and participants).
import { fail, must } from '../http';

export interface Room { id: string; kind: 'global' | 'dm' | 'event'; slug: string | null; dm_key: string | null; event_id: string | null }
const ROOM_COLUMNS = 'id, kind, slug, dm_key, event_id';

export async function globalRoom(db: any): Promise<Room> {
  const room = must(await db.from('club_rooms').select(ROOM_COLUMNS).eq('slug', 'global').maybeSingle()) as Room | null;
  if (!room) fail(503, 'The club chat is not set up yet.', 'not_ready');
  return room;
}

export async function getRoom(db: any, roomId: string): Promise<Room> {
  const room = must(await db.from('club_rooms').select(ROOM_COLUMNS).eq('id', roomId).maybeSingle()) as Room | null;
  if (!room) fail(404, 'Chat not found.');
  return room;
}

export async function joinRoom(db: any, roomId: string, userId: string) {
  const res = await db.from('club_room_members').insert({ room_id: roomId, user_id: userId });
  if (res.error && res.error.code !== '23505') throw res.error;
}

/** The direct-message room between two approved members, created on first use. */
export async function directRoom(db: any, me: string, other: string): Promise<Room> {
  if (me === other) fail(400, 'You cannot message yourself.');
  const peer = must(await db.from('viber_profiles').select('user_id').eq('user_id', other).eq('status', 'approved').maybeSingle());
  if (!peer) fail(404, 'That member is not available.');
  const dmKey = [me, other].sort().join(':');
  let room = must(await db.from('club_rooms').select(ROOM_COLUMNS).eq('dm_key', dmKey).maybeSingle()) as Room | null;
  if (!room) {
    const res = await db.from('club_rooms').insert({ kind: 'dm', dm_key: dmKey }).select(ROOM_COLUMNS).single();
    room = res.error?.code === '23505'
      ? (must(await db.from('club_rooms').select(ROOM_COLUMNS).eq('dm_key', dmKey).single()) as Room)
      : (must(res) as Room);
  }
  await joinRoom(db, room.id, me);
  await joinRoom(db, room.id, other);
  return room;
}

/** The event's discussion room, created on first use. */
export async function eventRoom(db: any, eventId: string): Promise<Room> {
  const found = must(await db.from('club_rooms').select(ROOM_COLUMNS).eq('event_id', eventId).maybeSingle()) as Room | null;
  if (found) return found;
  const res = await db.from('club_rooms').insert({ kind: 'event', event_id: eventId }).select(ROOM_COLUMNS).single();
  if (res.error?.code === '23505') return must(await db.from('club_rooms').select(ROOM_COLUMNS).eq('event_id', eventId).single()) as Room;
  return must(res) as Room;
}

/** Global is open to every approved member; other rooms only to the people in them (and staff). */
export async function assertRoomAccess(db: any, room: Room, userId: string, isStaff = false) {
  if (room.kind === 'global' || isStaff) return;
  const member = must(await db.from('club_room_members').select('user_id').eq('room_id', room.id).eq('user_id', userId).maybeSingle());
  if (!member) fail(403, 'You are not in this chat.', 'not_in_room');
}

/** The rooms a member is in, besides the global chat, newest first. */
export async function myRooms(db: any, userId: string) {
  const memberships = must(await db.from('club_room_members').select('room_id, last_read_at').eq('user_id', userId).limit(100)) as any[];
  if (memberships.length === 0) return [];
  const rooms = must(await db.from('club_rooms').select(ROOM_COLUMNS).in('id', memberships.map((m) => m.room_id))) as Room[];
  return rooms.filter((r) => r.kind !== 'global');
}
