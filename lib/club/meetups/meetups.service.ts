// Instant meetups by any approved member: posted in seconds, live straight away, no review. Members
// RSVP with "I'm in". The host counts as going. Hidden by staff, or cancelled, a meetup stops showing in lists.
import { fail, must } from '../http';
import { publicMembers } from '../membership/members';
import { signMedia } from '../media';
import { notify } from '../notifications.service';
import { allRows } from '../rows';
import { resolvePlace } from '../social/places.service';
import type { ViberProfile } from '../types';
import { cleanCovers, parseMeetup } from './meetup-input';
import { MAX_OPEN_MEETUPS } from './meetup-kinds';

export const MEETUP_COLUMNS = 'id, host_id, kind, title, note, venue, city, place_id, starts_at, ends_at, capacity, status, hidden, cover_paths, created_at';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FACES = 4;

export interface MeetupRow {
  id: string; host_id: string; kind: string; title: string; note: string | null; venue: string | null; city: string; place_id: string | null;
  starts_at: string; ends_at: string; capacity: number | null; status: 'open' | 'cancelled'; hidden: boolean; cover_paths: string[]; created_at: string;
}

async function loadMeetup(db: any, id: string): Promise<MeetupRow> {
  if (!UUID.test(id)) fail(404, 'Meetup not found.');
  const row = must(await db.from('club_meetups').select(MEETUP_COLUMNS).eq('id', id).maybeSingle()) as MeetupRow | null;
  if (!row) fail(404, 'Meetup not found.');
  return row as MeetupRow;
}

/** Cards for lists: who is going (a count and a few faces), the host, and where the viewer stands. */
export async function meetupCards(db: any, rows: MeetupRow[], viewerId: string, now = new Date()) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const going = await allRows(() => db.from('club_meetup_members').select('meetup_id, user_id').in('meetup_id', ids).order('meetup_id'));
  const byMeetup = new Map<string, string[]>();
  for (const g of going) byMeetup.set(g.meetup_id, [...(byMeetup.get(g.meetup_id) ?? []), g.user_id]);

  const faceIds = Array.from(byMeetup.values()).flatMap((list) => list.slice(0, FACES + 1));
  const people = new Map((await publicMembers(db, [...faceIds, ...rows.map((r) => r.host_id)])).map((m) => [m.user_id, m]));
  const urls = await signMedia(db, [...Array.from(people.values()).map((m) => m.avatar_url), ...rows.flatMap((r) => r.cover_paths ?? [])]);
  const avatar = (url: string | null) => (url ? urls.get(url) ?? null : null);

  return rows.map((r) => {
    const list = byMeetup.get(r.id) ?? [];
    const host = people.get(r.host_id);
    const t = now.getTime();
    return {
      source: 'meetup' as const,
      id: r.id, kind: r.kind, title: r.title, note: r.note, venue: r.venue, city: r.city, place_id: r.place_id,
      starts_at: r.starts_at, ends_at: r.ends_at, capacity: r.capacity, status: r.status, hidden: r.hidden,
      covers: (r.cover_paths ?? []).map((p) => urls.get(p)).filter((u): u is string => Boolean(u)),
      live: r.status === 'open' && Date.parse(r.starts_at) <= t && Date.parse(r.ends_at) > t,
      going: list.length,
      full: r.capacity != null && list.length >= r.capacity,
      faces: list.map((id) => people.get(id)).filter((m): m is NonNullable<typeof m> => Boolean(m)).slice(0, FACES)
        .map((m) => ({ name: m.name, avatar_url: avatar(m.avatar_url) })),
      host: host ? { user_id: host.user_id, name: host.name, handle: host.handle, city: host.city, avatar_url: avatar(host.avatar_url) } : null,
      me: { hosting: r.host_id === viewerId, going: list.includes(viewerId) },
    };
  });
}

export async function createMeetup(db: any, host: ViberProfile, body: Record<string, any>, now = new Date()) {
  const parsed = parseMeetup(body, now);
  if (!parsed.ok) fail(400, parsed.error);
  const input = parsed as Extract<typeof parsed, { ok: true }>;
  let row = input.row;
  let placeId: string | null = null;
  if (input.placeId) {
    // A listed place names the city, so the location filter and the place page agree.
    const place = await resolvePlace(db, input.placeId);
    placeId = place.id;
    row = { ...row, city: place.name };
  }
  const open = must(await db.from('club_meetups').select('id').eq('host_id', host.user_id).eq('status', 'open')
    .gt('ends_at', now.toISOString()).limit(MAX_OPEN_MEETUPS + 1)) as any[];
  if (open.length >= MAX_OPEN_MEETUPS) fail(409, `You already have ${MAX_OPEN_MEETUPS} meetups running. Cancel one or wait for it to end.`, 'meetup_limit');

  const created = must(await db.from('club_meetups').insert({ ...row, place_id: placeId, cover_paths: cleanCovers(body.cover_paths, host.user_id), host_id: host.user_id, status: 'open', hidden: false })
    .select(MEETUP_COLUMNS).single()) as MeetupRow;
  const joined = await db.from('club_meetup_members').insert({ meetup_id: created.id, user_id: host.user_id });
  if (joined.error && joined.error.code !== '23505') throw joined.error;
  return (await meetupCards(db, [created], host.user_id, now))[0];
}

/** Open, visible meetups that have not ended; or the member's own (`mine`), or ones they are in (`joined`). */
export async function listMeetups(db: any, viewerId: string, opts: { mine?: boolean; joined?: boolean; limit?: number } = {}, now = new Date()) {
  const limit = opts.limit ?? 200;
  let rows: MeetupRow[];
  if (opts.mine) {
    rows = must(await db.from('club_meetups').select(MEETUP_COLUMNS).eq('host_id', viewerId).order('created_at', { ascending: false }).limit(50)) as MeetupRow[];
  } else {
    let q = db.from('club_meetups').select(MEETUP_COLUMNS).eq('status', 'open').eq('hidden', false).gt('ends_at', now.toISOString());
    if (opts.joined) {
      const mine = must(await db.from('club_meetup_members').select('meetup_id').eq('user_id', viewerId).limit(200)) as any[];
      if (mine.length === 0) return [];
      q = q.in('id', mine.map((m) => m.meetup_id));
    }
    rows = must(await q.order('starts_at', { ascending: true }).limit(limit)) as MeetupRow[];
  }
  return meetupCards(db, rows, viewerId, now);
}

/** Every meetup the member is in, past ones too, newest first (for their history). Hidden ones are left out. */
export async function joinedMeetupCards(db: any, userId: string, now = new Date()) {
  const mine = must(await db.from('club_meetup_members').select('meetup_id').eq('user_id', userId).limit(300)) as any[];
  if (mine.length === 0) return [];
  const rows = must(await db.from('club_meetups').select(MEETUP_COLUMNS).in('id', mine.map((m) => m.meetup_id)).eq('hidden', false)
    .order('starts_at', { ascending: false }).limit(150)) as MeetupRow[];
  return meetupCards(db, rows, userId, now);
}
/** The meetup page: the card plus everyone who is in. Hidden meetups are seen only by their host and staff. */
export async function meetupView(db: any, id: string, viewerId: string, staff: boolean, now = new Date()) {
  const row = await loadMeetup(db, id);
  if (row.hidden && !staff && row.host_id !== viewerId) fail(404, 'Meetup not found.');
  const [card] = await meetupCards(db, [row], viewerId, now);
  const members = must(await db.from('club_meetup_members').select('user_id').eq('meetup_id', id).order('created_at', { ascending: true }).limit(60)) as any[];
  const people = await publicMembers(db, members.map((m) => m.user_id));
  const urls = await signMedia(db, people.map((p) => p.avatar_url));
  const order = new Map(members.map((m, i) => [m.user_id, i]));
  const attendees = people.sort((a, b) => (order.get(a.user_id) ?? 0) - (order.get(b.user_id) ?? 0))
    .map((p) => ({ user_id: p.user_id, name: p.name, handle: p.handle, avatar_url: p.avatar_url ? urls.get(p.avatar_url) ?? null : null, host: p.user_id === row.host_id }));
  return { meetup: card, attendees, staff };
}

export async function joinMeetup(db: any, id: string, member: ViberProfile, now = new Date()) {
  const row = await loadMeetup(db, id);
  if (row.hidden || row.status !== 'open') fail(404, 'Meetup not found.');
  if (Date.parse(row.ends_at) <= now.getTime()) fail(409, 'This meetup has ended.', 'meetup_ended');
  const members = must(await db.from('club_meetup_members').select('user_id').eq('meetup_id', id).limit(1000)) as any[];
  const already = members.some((m) => m.user_id === member.user_id);
  if (!already) {
    if (row.capacity != null && members.length >= row.capacity) fail(409, 'This meetup is full.', 'meetup_full');
    const res = await db.from('club_meetup_members').insert({ meetup_id: id, user_id: member.user_id });
    if (res.error && res.error.code !== '23505') throw res.error;
    if (!res.error && row.host_id !== member.user_id) {
      try {
        const [who] = await publicMembers(db, [member.user_id]);
        await notify(db, [row.host_id], { kind: 'meetup', title: 'Someone is in', body: `${who?.name ?? 'A member'} joined “${row.title}”.`, link: `/club/meetups/${id}` });
      } catch { /* the RSVP stands even if the notice cannot be sent */ }
    }
  }
  return (await meetupCards(db, [row], member.user_id, now))[0];
}

export async function leaveMeetup(db: any, id: string, userId: string, now = new Date()) {
  const row = await loadMeetup(db, id);
  if (row.host_id === userId) fail(400, 'You are hosting this meetup. Cancel it instead.');
  must(await db.from('club_meetup_members').delete().eq('meetup_id', id).eq('user_id', userId));
  return (await meetupCards(db, [row], userId, now))[0];
}

/** The host (or staff) cancels; everyone who was going is told. */
export async function cancelMeetup(db: any, id: string, actorId: string, staff: boolean, now = new Date()) {
  const row = await loadMeetup(db, id);
  if (row.host_id !== actorId && !staff) fail(403, 'Only the host can cancel this meetup.');
  if (row.status === 'cancelled') return (await meetupCards(db, [row], actorId, now))[0];
  const updated = must(await db.from('club_meetups').update({ status: 'cancelled', updated_at: now.toISOString() }).eq('id', id).select(MEETUP_COLUMNS)) as MeetupRow[];
  const members = must(await db.from('club_meetup_members').select('user_id').eq('meetup_id', id).limit(1000)) as any[];
  const others = members.map((m) => m.user_id).filter((u) => u !== actorId);
  if (others.length) {
    try { await notify(db, others, { kind: 'meetup', title: 'Meetup cancelled', body: `“${row.title}” was cancelled.`, link: `/club/meetups/${id}` }); } catch { /* best effort */ }
  }
  return (await meetupCards(db, updated, actorId, now))[0];
}
