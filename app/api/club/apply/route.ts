import { adminDb } from '@/lib/supabase/admin';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { clubApi, ok, readBody } from '@/lib/club/http';
import { requireUser } from '@/lib/club/auth';
import { applyToClub } from '@/lib/club/membership/apply.service';

export const dynamic = 'force-dynamic';

/** POST /api/club/apply — submits the application for staff review. */
export const POST = clubApi('Apply', async (request) => {
  const user = await requireUser();
  const limited = await enforceRateLimit(request, 'club_apply', 10, 60 * 60_000, user.id);
  if (limited) return limited;
  const profile = await applyToClub(adminDb(), user.id, await readBody(request));
  return ok({ profile: { ...profile, dob: undefined } });
});
