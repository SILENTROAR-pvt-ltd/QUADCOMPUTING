import { adminDb } from '@/lib/supabase/admin';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { clubApi, ok, query, readBody } from '@/lib/club/http';
import { requireMember } from '@/lib/club/auth';
import { createEvent, listEvents } from '@/lib/club/events/events.service';
import { signMedia } from '@/lib/club/media';

export const dynamic = 'force-dynamic';

/** GET /api/club/events?mine=1 — upcoming approved plans, or the member's own plans in any state. */
export const GET = clubApi('Events', async (request) => {
  const db = adminDb();
  const { user } = await requireMember(db);
  const mine = query(request).get('mine') === '1';
  const events = await listEvents(db, mine ? { mine: user.id } : {});
  const upcoming = mine ? events : events.filter((e) => Date.parse(e.ends_at) > Date.now());
  const urls = await signMedia(db, upcoming.map((e) => e.cover_paths[0]));
  return ok({
    events: upcoming.map((e) => ({
      id: e.id, title: e.title, kind: e.kind, starts_at: e.starts_at, ends_at: e.ends_at, venue: e.venue, status: e.status, verified: e.verified,
      ticket_price: e.ticket_price, capacity: e.capacity, cover: e.cover_paths[0] ? urls.get(e.cover_paths[0]) ?? null : null,
    })),
  });
});

/** POST /api/club/events — a new draft plan (any approved member). */
export const POST = clubApi('CreateEvent', async (request) => {
  const db = adminDb();
  const { user, profile } = await requireMember(db, { speak: true });
  const limited = await enforceRateLimit(request, 'club_event_create', 10, 24 * 3600_000, user.id);
  if (limited) return limited;
  return ok({ event: await createEvent(db, profile, await readBody(request)) });
});
