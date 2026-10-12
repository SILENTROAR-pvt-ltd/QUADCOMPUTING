import { adminDb } from '@/lib/supabase/admin';
import { clubApi, idParam, ok, query } from '@/lib/club/http';
import { requireMember } from '@/lib/club/auth';
import { networkOf } from '@/lib/club/social/follow.service';

export const dynamic = 'force-dynamic';

/** GET /api/club/members/:id/network?list=followers|following — who follows them, or who they follow. */
export const GET = clubApi('Network', async (request, ctx) => {
  const db = adminDb();
  const { user } = await requireMember(db);
  const list = query(request).get('list') === 'following' ? 'following' : 'followers';
  return ok({ members: await networkOf(db, await idParam(ctx), user.id, list) });
});
