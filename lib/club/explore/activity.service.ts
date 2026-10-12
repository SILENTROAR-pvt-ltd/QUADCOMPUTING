// A member's own activity: what they are hosting (trips, events and meetups, in any state), what they have
// joined, and their history. One list for the Trips screen, so hosting and going are the same everywhere.
import { eventCards, joinedEventIds } from '../events/event-cards.service';
import { listEvents } from '../events/events.service';
import { joinedMeetupCards, listMeetups } from '../meetups/meetups.service';
import type { ExploreItem } from './explore-filter';
import { meetupItem, planItem } from './explore.service';

const DONE = new Set(['cancelled', 'completed']);
const RUNNING = new Set(['approved', 'open']);

/** History: finished, cancelled, or a running plan whose time has passed. Drafts and reviews are never history. */
function isPast(i: ExploreItem, t: number) {
  const status = i.status ?? '';
  return DONE.has(status) || (RUNNING.has(status) && Date.parse(i.ends_at) <= t);
}

export async function myActivity(db: any, userId: string, now = new Date()) {
  const t = now.getTime();
  const [hostedPlans, joinedIds, hostedMeetups, joinedMeetups] = await Promise.all([
    listEvents(db, { mine: userId, limit: 100 }),
    joinedEventIds(db, userId),
    listMeetups(db, userId, { mine: true }, now),
    joinedMeetupCards(db, userId, now),
  ]);
  const hostedIds = new Set(hostedPlans.map((e) => e.id));
  const joinedPlans = await listEvents(db, { ids: joinedIds.filter((id) => !hostedIds.has(id)), limit: 100 });
  const cards = await eventCards(db, [...hostedPlans, ...joinedPlans], userId);

  const byKey = new Map<string, ExploreItem>();
  for (const p of cards) byKey.set(`plan-${p.id}`, planItem(p, now));
  for (const m of [...joinedMeetups, ...hostedMeetups]) byKey.set(`meetup-${m.id}`, meetupItem(m));

  const items = Array.from(byKey.values())
    .filter((i) => i.me.hosting || i.me.going)
    .map((i) => (isPast(i, t) && !DONE.has(i.status ?? '') ? { ...i, status: 'ended', live: false } : i));
  const past = items.filter((i) => isPast(i, t) || i.status === 'ended');
  const active = items.filter((i) => !past.includes(i));
  const soonest = (a: ExploreItem, b: ExploreItem) => Date.parse(a.starts_at) - Date.parse(b.starts_at);

  return {
    hosting: active.filter((i) => i.me.hosting).sort(soonest),
    going: active.filter((i) => !i.me.hosting && i.me.going).sort(soonest),
    history: past.sort((a, b) => soonest(b, a)),
  };
}
