import { adminDb } from '@/lib/supabase/admin';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { clubApi, ok } from '@/lib/club/http';
import { publicBubbles } from '@/lib/club/presence.service';

export const dynamic = 'force-dynamic';

/** GET /api/club/bubbles — the public landing's "online now" bubbles (first names or club names only). */
export const GET = clubApi('Bubbles', async (request) => {
  const limited = await enforceRateLimit(request, 'club_bubbles', 120, 60_000);
  if (limited) return limited;
  return ok({ bubbles: await publicBubbles(adminDb()) });
});
