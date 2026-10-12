import { adminDb } from '@/lib/supabase/admin';
import { clubApi, idParam, ok } from '@/lib/club/http';
import { requireMember } from '@/lib/club/auth';
import { placeDetail } from '@/lib/club/social/places.service';

export const dynamic = 'force-dynamic';

/** GET /api/club/places/:id — one place: stats, whether you plan to go, and who is planning to go. */
export const GET = clubApi('Place', async (_request, ctx) => {
  const db = adminDb();
  const { user } = await requireMember(db);
  return ok(await placeDetail(db, await idParam(ctx), user.id));
});
