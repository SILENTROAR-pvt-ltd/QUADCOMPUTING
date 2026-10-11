import { adminDb } from '@/lib/supabase/admin';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { clubApi, ok } from '@/lib/club/http';
import { requireMember } from '@/lib/club/auth';
import { heartbeat } from '@/lib/club/presence.service';

export const dynamic = 'force-dynamic';

/** POST /api/club/presence/heartbeat — "I'm here", sent every 20 s while the club tab is visible. */
export const POST = clubApi('Heartbeat', async (request) => {
  const db = adminDb();
  const { user } = await requireMember(db);
  const limited = await enforceRateLimit(request, 'club_heartbeat', 12, 60_000, user.id);
  if (limited) return limited;
  await heartbeat(db, user.id);
  return ok();
});
