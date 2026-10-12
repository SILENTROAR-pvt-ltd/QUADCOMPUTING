import { adminDb } from '@/lib/supabase/admin';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { clubApi, ok, query, readBody } from '@/lib/club/http';
import { requireMember } from '@/lib/club/auth';
import { createMeetup, listMeetups } from '@/lib/club/meetups/meetups.service';

export const dynamic = 'force-dynamic';

/** GET /api/club/meetups — what is on; ?mine=1 the member's own in any state; ?joined=1 the ones they are in. */
export const GET = clubApi('Meetups', async (request) => {
  const db = adminDb();
  const { user } = await requireMember(db);
  const params = query(request);
  const mine = params.get('mine') === '1';
  return ok({ meetups: await listMeetups(db, user.id, { mine, joined: !mine && params.get('joined') === '1' }) });
});

/** POST /api/club/meetups — an instant meetup, live at once (no review). Any approved member who is not muted. */
export const POST = clubApi('CreateMeetup', async (request) => {
  const db = adminDb();
  const { user, profile } = await requireMember(db, { speak: true });
  const limited = await enforceRateLimit(request, 'club_meetup_create', 8, 24 * 3600_000, user.id);
  if (limited) return limited;
  return ok({ meetup: await createMeetup(db, profile, await readBody(request)) });
});
