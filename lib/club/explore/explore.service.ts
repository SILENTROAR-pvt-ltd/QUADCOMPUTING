// Explore: one feed of what is happening, from reviewed plans (trips and ticketed events) and instant
// meetups (coffee, walks, parties, developer meets ...). Members search, and filter by place, type and time.
// The rules for searching and filtering live in explore-filter.ts, shared with the screen.
import { eventCards } from '../events/event-cards.service';
import { listEvents } from '../events/events.service';
import { listMeetups } from '../meetups/meetups.service';
import { filterExplore, sortExplore, type ExploreItem, type ExploreOptions } from './explore-filter';

export type { ExploreItem, ExploreOptions } from './explore-filter';

/** What a reviewed plan is called in Explore. The old "short plan" is a get-together now. */
const PLAN_TYPE: Record<string, string> = { tour: 'trip', event: 'event', short_plan: 'together' };

/** Enough for the screen to search and filter on its own, without asking the server again. */
const LIMIT = 150;

type PlanCardData = Awaited<ReturnType<typeof eventCards>>[number];
type MeetupCardData = Awaited<ReturnType<typeof listMeetups>>[number];

export function planItem(p: PlanCardData, now: Date): ExploreItem {
  const t = now.getTime();
  return {
    source: 'plan', id: p.id, type: PLAN_TYPE[p.kind] ?? 'event', title: p.title, note: null,
    location: p.venue || null, starts_at: p.starts_at, ends_at: p.ends_at,
    live: p.status === 'approved' && Date.parse(p.starts_at) <= t && Date.parse(p.ends_at) > t, cover: p.cover, price: Number(p.ticket_price) || 0,
    going: p.people, capacity: p.capacity, full: p.capacity > 0 && p.going >= p.capacity, verified: p.verified, faces: p.faces,
    host: p.host ? { user_id: p.host.user_id, name: p.host.name, avatar_url: p.host.avatar_url } : null,
    me: { hosting: p.me.hosting, going: p.me.going || p.me.interested }, status: p.status,
  };
}

export function meetupItem(m: MeetupCardData): ExploreItem {
  return {
    source: 'meetup', id: m.id, type: m.kind, title: m.title, note: m.note,
    location: m.venue ? `${m.venue}, ${m.city}` : m.city, starts_at: m.starts_at, ends_at: m.ends_at, live: m.live, cover: m.covers[0] ?? null, price: 0,
    going: m.going, capacity: m.capacity, full: m.full, verified: false, faces: m.faces,
    host: m.host ? { user_id: m.host.user_id, name: m.host.name, avatar_url: m.host.avatar_url } : null,
    me: m.me, status: m.status,
  };
}

export async function exploreFeed(db: any, viewerId: string, opts: ExploreOptions = {}, now = new Date()) {
  const t = now.getTime();
  const [plans, meetups] = await Promise.all([
    listEvents(db, { limit: 200 }).then((rows) => rows.filter((e) => Date.parse(e.ends_at) > t)).then((rows) => eventCards(db, rows, viewerId)),
    listMeetups(db, viewerId, {}, now),
  ]);

  const items: ExploreItem[] = [...plans.map((p) => planItem(p, now)), ...meetups.map(meetupItem)];
  const matches = sortExplore(filterExplore(items, opts));
  return { items: matches.slice(0, LIMIT), total: matches.length };
}
