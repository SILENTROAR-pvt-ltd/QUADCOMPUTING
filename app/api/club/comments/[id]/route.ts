import { adminDb } from '@/lib/supabase/admin';
import { clubApi, idParam, ok } from '@/lib/club/http';
import { requireMember, staffRole } from '@/lib/club/auth';
import { deleteComment } from '@/lib/club/room/comments.service';

export const dynamic = 'force-dynamic';

/** DELETE /api/club/comments/:id — the commenter (or staff) removes a comment. */
export const DELETE = clubApi('DeleteComment', async (_request, ctx) => {
  const db = adminDb();
  const { user } = await requireMember(db);
  const id = await idParam(ctx);
  await deleteComment(db, id, user.id, Boolean(await staffRole(db, user)));
  return ok();
});
