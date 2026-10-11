import { adminDb } from '@/lib/supabase/admin';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { clubApi, ok, readBody } from '@/lib/club/http';
import { requireMember } from '@/lib/club/auth';
import { makeOffer } from '@/lib/club/marketplace/offers.service';

export const dynamic = 'force-dynamic';

/** POST /api/club/offers { event_id, property_id, rate, guests, check_in, check_out, add_ons?, note? } */
export const POST = clubApi('MakeOffer', async (request) => {
  const db = adminDb();
  const { user, profile } = await requireMember(db, { speak: true });
  const limited = await enforceRateLimit(request, 'club_offer', 30, 24 * 3600_000, user.id);
  if (limited) return limited;
  return ok({ offer: await makeOffer(db, profile, await readBody(request)) });
});
