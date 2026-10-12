import { adminDb } from '@/lib/supabase/admin';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { clubApi, idParam, ok, readBody } from '@/lib/club/http';
import { requireMember } from '@/lib/club/auth';
import { toggleLike } from '@/lib/club/room/posts.service';

export const dynamic = 'force-dynamic';

/** POST /api/club/posts/:id/like { on } — like or unlike; returns the new count. */
export const POST = clubApi('LikePost', async (request, ctx) => {
  const db = adminDb();
  const { user } = await requireMember(db, { speak: true });
  const limited = await enforceRateLimit(request, 'club_post_like', 300, 3600_000, user.id);
  if (limited) return limited;
  const id = await idParam(ctx);
  const body = await readBody(request);
  return ok(await toggleLike(db, id, user.id, body.on !== false));
});
