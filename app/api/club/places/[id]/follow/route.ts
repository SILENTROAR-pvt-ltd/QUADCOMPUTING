import { adminDb } from '@/lib/supabase/admin';
import { clubApi, idParam, ok, readBody } from '@/lib/club/http';
import { requireMember } from '@/lib/club/auth';
import { setPlaceFollow } from '@/lib/club/social/places.service';

export const dynamic = 'force-dynamic';

/** POST /api/club/places/:id/follow { on } — "I'm planning to go" (or stop planning). */
export const POST = clubApi('PlaceFollow', async (request, ctx) => {
  const db = adminDb();
  const { user } = await requireMember(db);
  const body = await readBody(request);
  return ok(await setPlaceFollow(db, user.id, await idParam(ctx), body.on !== false));
});
