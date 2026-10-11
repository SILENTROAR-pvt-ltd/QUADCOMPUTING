import { adminDb } from '@/lib/supabase/admin';
import { clubApi, fail, ok, readBody } from '@/lib/club/http';
import { requireMember } from '@/lib/club/auth';
import { directRoom } from '@/lib/club/chat/rooms.service';

export const dynamic = 'force-dynamic';

/** POST /api/club/rooms/dm { user_id } — opens (or creates) the 1:1 chat with another member. */
export const POST = clubApi('DirectRoom', async (request) => {
  const db = adminDb();
  const { user } = await requireMember(db, { speak: true });
  const body = await readBody(request);
  if (typeof body.user_id !== 'string') fail(400, 'Choose a member to message.');
  const room = await directRoom(db, user.id, body.user_id);
  return ok({ roomId: room.id });
});
