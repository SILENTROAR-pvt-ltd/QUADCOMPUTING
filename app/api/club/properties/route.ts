import { adminDb } from '@/lib/supabase/admin';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { clubApi, ok, query, readBody } from '@/lib/club/http';
import { requireMember } from '@/lib/club/auth';
import { createProperty, searchProperties } from '@/lib/club/marketplace/properties.service';
import { toPaise } from '@/lib/club/money';
import { signMedia } from '@/lib/club/media';

export const dynamic = 'force-dynamic';

/** GET /api/club/properties?city=&category=&guests=&max_rate=&amenity= — verified partner properties. */
export const GET = clubApi('Properties', async (request) => {
  const db = adminDb();
  await requireMember(db);
  const q = query(request);
  const guests = Number(q.get('guests'));
  const list = await searchProperties(db, {
    city: q.get('city')?.slice(0, 60) || null, category: q.get('category') || null, amenity: q.get('amenity') || null,
    guests: Number.isInteger(guests) && guests > 0 ? guests : null, maxRate: q.get('max_rate') ? toPaise(q.get('max_rate')) : null,
  });
  const urls = await signMedia(db, list.map((p) => p.photo_paths[0]));
  return ok({ properties: list.map((p) => ({ ...p, photo: p.photo_paths[0] ? urls.get(p.photo_paths[0]) ?? null : null, photo_paths: undefined })) });
});

/** POST /api/club/properties — a business member lists a property (pending staff verification). */
export const POST = clubApi('CreateProperty', async (request) => {
  const db = adminDb();
  const { user, profile } = await requireMember(db, { speak: true });
  const limited = await enforceRateLimit(request, 'club_property_create', 10, 24 * 3600_000, user.id);
  if (limited) return limited;
  return ok({ property: await createProperty(db, profile, await readBody(request)) });
});
