import { adminDb } from '@/lib/supabase/admin';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { clubApi, idParam, ok, readBody } from '@/lib/club/http';
import { requireMember } from '@/lib/club/auth';
import { setFollow } from '@/lib/club/social/follow.service';

export const dynamic = 'force-dynamic';

/** POST /api/club/members/:id/follow { on } — follow or unfollow a member. */
export const POST = clubApi('Follow', async (request, ctx) => {
  const db = adminDb();
  const { user, profile } = await requireMember(db);
  const limited = await enforceRateLimit(request, 'club_follow', 200, 3600_000, user.id);
  if (limited) return limited;
  const body = await readBody(request);
  return ok(await setFollow(db, profile, await idParam(ctx), body.on !== false));
});
