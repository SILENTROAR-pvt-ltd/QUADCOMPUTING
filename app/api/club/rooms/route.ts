import { adminDb } from '@/lib/supabase/admin';
import { clubApi, must, ok } from '@/lib/club/http';
import { requireMember } from '@/lib/club/auth';
import { globalRoom, myRooms } from '@/lib/club/chat/rooms.service';
import { unreadCounts } from '@/lib/club/chat/messages.service';
import { publicMembers } from '@/lib/club/membership/members';

export const dynamic = 'force-dynamic';

/** GET /api/club/rooms — the global chat, the member's DMs and event rooms, with unread counts. */
export const GET = clubApi('Rooms', async () => {
  const db = adminDb();
  const { user } = await requireMember(db);
  const [global, rooms, unread] = await Promise.all([globalRoom(db), myRooms(db, user.id), unreadCounts(db, user.id)]);

  const peers = rooms.filter((r) => r.kind === 'dm').map((r) => (r.dm_key || '').split(':').find((id) => id !== user.id) || '');
  const members = new Map((await publicMembers(db, peers.filter(Boolean))).map((m) => [m.user_id, m]));
  const eventIds = rooms.filter((r) => r.kind === 'event' && r.event_id).map((r) => r.event_id as string);
  const events = eventIds.length ? (must(await db.from('club_events').select('id, title').in('id', eventIds)) as any[]) : [];
  const titles = new Map(events.map((e) => [e.id, e.title]));

  return ok({
    global: { id: global.id, unread: unread[global.id] ?? 0 },
    rooms: rooms.map((r) => {
      const peer = r.kind === 'dm' ? members.get((r.dm_key || '').split(':').find((id) => id !== user.id) || '') : null;
      return { id: r.id, kind: r.kind, title: r.kind === 'dm' ? peer?.name ?? 'Member' : titles.get(r.event_id || '') ?? 'Plan', peer: peer ?? null, unread: unread[r.id] ?? 0 };
    }),
  });
});
