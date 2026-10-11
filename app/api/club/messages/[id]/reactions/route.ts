import { adminDb } from '@/lib/supabase/admin';
import { clubApi, fail, idParam, must, ok, readBody } from '@/lib/club/http';
import { requireMember } from '@/lib/club/auth';
import { assertRoomAccess, getRoom } from '@/lib/club/chat/rooms.service';
import { toggleReaction } from '@/lib/club/chat/messages.service';

export const dynamic = 'force-dynamic';

/** POST /api/club/messages/:id/reactions { emoji, on } — adds or removes one emoji reaction. */
export const POST = clubApi('Reaction', async (request, ctx) => {
  const db = adminDb();
  const { user } = await requireMember(db, { speak: true });
  const messageId = await idParam(ctx);
  const message = must(await db.from('club_messages').select('room_id, hidden, sender_id').eq('id', messageId).maybeSingle()) as any;
  if (!message || (message.hidden && message.sender_id !== user.id)) fail(404, 'Message not found.');
  await assertRoomAccess(db, await getRoom(db, message.room_id), user.id);
  const body = await readBody(request);
  await toggleReaction(db, messageId, user.id, body.emoji, body.on !== false);
  return ok();
});
