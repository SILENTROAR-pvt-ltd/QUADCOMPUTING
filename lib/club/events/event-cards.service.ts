// Plan cards for lists: who is going (a count and a few faces), how many are interested, and where
// the viewer stands (hosting, going or interested). Faces show members as members may see them.
import { must } from '../http';
import { publicMembers } from '../membership/members';
import { signMedia } from '../media';
import { allRows } from '../rows';
import type { ClubEvent } from '../types';

const FACES = 3;

/** Approved or completed plans the member has a spot in or is interested in. */
export async function joinedEventIds(db: any, userId: string): Promise<string[]> {
  const [spots, interest] = await Promise.all([
    db.from('club_event_participants').select('event_id').eq('user_id', userId).neq('status', 'cancelled').limit(500).then(must),
    db.from('club_event_interest').select('event_id').eq('user_id', userId).limit(500).then(must),
  ]);
  return Array.from(new Set([...(spots as any[]), ...(interest as any[])].map((r) => r.event_id)));
}

export async function eventCards(db: any, events: ClubEvent[], viewerId: string) {
  const ids = events.map((e) => e.id);
  if (ids.length === 0) return [];
  const [spots, interest] = await Promise.all([
    allRows(() => db.from('club_event_participants').select('event_id, user_id').in('event_id', ids).neq('status', 'cancelled').order('event_id')),
    allRows(() => db.from('club_event_interest').select('event_id, user_id').in('event_id', ids).order('event_id')),
  ]);
  const people = new Map<string, string[]>();
  for (const r of [...spots, ...interest]) {
    const list = people.get(r.event_id) ?? [];
    if (!list.includes(r.user_id)) list.push(r.user_id);
    people.set(r.event_id, list);
  }
  const faceIds = Array.from(people.values()).flatMap((list) => list.slice(0, FACES + 2));
  const members = new Map((await publicMembers(db, [...faceIds, ...events.map((e) => e.creator_id)])).map((m) => [m.user_id, m]));
  const urls = await signMedia(db, [...events.map((e) => e.cover_paths[0]), ...Array.from(members.values()).map((m) => m.avatar_url)]);
  const avatar = (url: string | null) => (url ? urls.get(url) ?? null : null);

  return events.map((e) => {
    const list = people.get(e.id) ?? [];
    const faces = list.map((id) => members.get(id)).filter((m): m is NonNullable<typeof m> => Boolean(m)).slice(0, FACES)
      .map((m) => ({ name: m.name, avatar_url: avatar(m.avatar_url) }));
    const host = members.get(e.creator_id);
    return {
      id: e.id, title: e.title, kind: e.kind, starts_at: e.starts_at, ends_at: e.ends_at, venue: e.venue, status: e.status, verified: e.verified,
      ticket_price: e.ticket_price, capacity: e.capacity, cover: e.cover_paths[0] ? urls.get(e.cover_paths[0]) ?? null : null,
      host: host ? { user_id: host.user_id, name: host.name, city: host.city, avatar_url: avatar(host.avatar_url) } : null,
      going: spots.filter((s) => s.event_id === e.id).length,
      interested: interest.filter((s) => s.event_id === e.id).length,
      people: list.length,
      faces,
      me: {
        hosting: e.creator_id === viewerId,
        going: spots.some((s) => s.event_id === e.id && s.user_id === viewerId),
        interested: interest.some((s) => s.event_id === e.id && s.user_id === viewerId),
      },
    };
  });
}
