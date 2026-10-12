import { adminDb } from '@/lib/supabase/admin';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { clubApi, ok, query, readBody } from '@/lib/club/http';
import { requireMember } from '@/lib/club/auth';
import { createEvent, listEvents } from '@/lib/club/events/events.service';
import { eventCards, joinedEventIds } from '@/lib/club/events/event-cards.service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/club/events — upcoming approved plans; ?mine=1 the member's own plans in any state;
 * ?joined=1 upcoming plans they have a spot in or are interested in. Each card says who is going.
 */
export const GET = clubApi('Events', async (request) => {
  const db = adminDb();
  const { user } = await requireMember(db);
  const params = query(request);
  const mine = params.get('mine') === '1';
  const joined = !mine && params.get('joined') === '1';
  const events = await listEvents(db, mine ? { mine: user.id } : joined ? { ids: await joinedEventIds(db, user.id) } : {});
  const upcoming = mine ? events : events.filter((e) => Date.parse(e.ends_at) > Date.now());
  return ok({ events: await eventCards(db, upcoming, user.id) });
});

/** POST /api/club/events — a new draft plan (any approved member). */
export const POST = clubApi('CreateEvent', async (request) => {
  const db = adminDb();
  const { user, profile } = await requireMember(db, { speak: true });
  const limited = await enforceRateLimit(request, 'club_event_create', 10, 24 * 3600_000, user.id);
  if (limited) return limited;
  return ok({ event: await createEvent(db, profile, await readBody(request)) });
});
