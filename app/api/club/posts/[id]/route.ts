import { adminDb } from '@/lib/supabase/admin';
import { clubApi, idParam, ok } from '@/lib/club/http';
import { requireMember, staffRole } from '@/lib/club/auth';
import { deletePost, getPost } from '@/lib/club/room/posts.service';

export const dynamic = 'force-dynamic';

/** GET /api/club/posts/:id — one Common Room post (for links from notifications). */
export const GET = clubApi('Post', async (_request, ctx) => {
  const db = adminDb();
  const { user } = await requireMember(db);
  const id = await idParam(ctx);
  return ok({ post: await getPost(db, id, user.id, Boolean(await staffRole(db, user))) });
});

/** DELETE /api/club/posts/:id — the author (or staff) removes a post. */
export const DELETE = clubApi('DeletePost', async (_request, ctx) => {
  const db = adminDb();
  const { user } = await requireMember(db);
  const id = await idParam(ctx);
  await deletePost(db, id, user.id, Boolean(await staffRole(db, user)));
  return ok();
});
