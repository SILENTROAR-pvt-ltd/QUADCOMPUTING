import { adminDb } from '@/lib/supabase/admin';
import { clubApi, idParam, ok } from '@/lib/club/http';
import { requireMember } from '@/lib/club/auth';
import { assertRoomAccess, getRoom } from '@/lib/club/chat/rooms.service';
import { markRead } from '@/lib/club/chat/messages.service';

export const dynamic = 'force-dynamic';

/** POST /api/club/rooms/:id/read — clears this room's unread counter. */
export const POST = clubApi('RoomRead', async (_request, ctx) => {
  const db = adminDb();
  const { user } = await requireMember(db);
  const room = await getRoom(db, await idParam(ctx));
  await assertRoomAccess(db, room, user.id);
  await markRead(db, room.id, user.id);
  return ok();
});
