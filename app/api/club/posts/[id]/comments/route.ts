import { adminDb } from '@/lib/supabase/admin';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { clubApi, idParam, ok, readBody } from '@/lib/club/http';
import { requireMember, staffRole } from '@/lib/club/auth';
import { addComment, listComments } from '@/lib/club/room/comments.service';

export const dynamic = 'force-dynamic';

/** GET /api/club/posts/:id/comments — the conversation under a post, oldest first. */
export const GET = clubApi('PostComments', async (_request, ctx) => {
  const db = adminDb();
  const { user } = await requireMember(db);
  const id = await idParam(ctx);
  return ok({ comments: await listComments(db, id, user.id, Boolean(await staffRole(db, user))) });
});

/** POST /api/club/posts/:id/comments { body } */
export const POST = clubApi('AddComment', async (request, ctx) => {
  const db = adminDb();
  const { user, profile } = await requireMember(db, { speak: true });
  const limited = await enforceRateLimit(request, 'club_comment', 120, 24 * 3600_000, user.id);
  if (limited) return limited;
  const id = await idParam(ctx);
  return ok({ comment: await addComment(db, id, profile, await readBody(request)) }, { status: 201 });
});
