import { adminDb } from '@/lib/supabase/admin';
import { clubApi, ok, query } from '@/lib/club/http';
import { requireMember } from '@/lib/club/auth';
import { listPlaces } from '@/lib/club/social/places.service';

export const dynamic = 'force-dynamic';

/** GET /api/club/places?region=&q=&kind=&sort=trending|name — places, with live stats and whether you plan to go. */
export const GET = clubApi('Places', async (request) => {
  const db = adminDb();
  const { user } = await requireMember(db);
  const params = query(request);
  return ok(await listPlaces(db, user.id, {
    region: params.get('region'), q: params.get('q'), kind: params.get('kind'), sort: params.get('sort'),
  }));
});
