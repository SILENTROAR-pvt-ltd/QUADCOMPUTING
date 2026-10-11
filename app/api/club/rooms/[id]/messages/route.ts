import { adminDb } from '@/lib/supabase/admin';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { clubApi, idParam, ok, query, readBody } from '@/lib/club/http';
import { requireMember, staffRole } from '@/lib/club/auth';
import { assertRoomAccess, getRoom } from '@/lib/club/chat/rooms.service';
import { listMessages, markRead, sendMessage } from '@/lib/club/chat/messages.service';

export const dynamic = 'force-dynamic';

/** GET /api/club/rooms/:id/messages?before= — a page of messages (newest 40), and marks the room read. */
export const GET = clubApi('Messages', async (request, ctx) => {
  const db = adminDb();
  const { user } = await requireMember(db);
  const room = await getRoom(db, await idParam(ctx));
  const staff = Boolean(await staffRole(db, user));
  await assertRoomAccess(db, room, user.id, staff);
  const before = query(request).get('before');
  const page = await listMessages(db, room.id, user.id, { before: before && !Number.isNaN(Date.parse(before)) ? before : null, staff });
  if (!before) await markRead(db, room.id, user.id);
  return ok({ room: { id: room.id, kind: room.kind }, ...page });
});

/** POST /api/club/rooms/:id/messages { body, image_path? } */
export const POST = clubApi('SendMessage', async (request, ctx) => {
  const db = adminDb();
  const { user, profile } = await requireMember(db, { speak: true });
  const limited = await enforceRateLimit(request, 'club_message', 30, 60_000, user.id);
  if (limited) return limited;
  const room = await getRoom(db, await idParam(ctx));
  await assertRoomAccess(db, room, user.id);
  const message = await sendMessage(db, room.id, profile, await readBody(request));
  return ok({ message });
});
