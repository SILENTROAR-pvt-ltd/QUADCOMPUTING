// Places: the regions (India, Asia, ...) hold countries' places (Goa, Manali, Old Manali ...). Members
// browse, search and filter them, follow the ones they plan to visit, and see the live stories, posts
// and people planning each one. Only active places are listed; stories and posts pick one by id.
import { fail, must } from '../http';
import { publicMembers } from '../membership/members';
import { signMedia } from '../media';
import { allRows } from '../rows';
import { placeTrendScore } from './ranking';

export const KINDS = ['beach', 'mountains', 'city', 'heritage', 'food', 'nightlife', 'nature', 'adventure', 'spiritual'] as const;
export const PLACE_COLUMNS = 'id, slug, name, region, country, kinds, blurb, cover_path, active';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TREND_DAYS = 7;
const FACES = 12;

export interface PlaceRow {
  id: string; slug: string; name: string; region: string; country: string;
  kinds: string[]; blurb: string | null; cover_path: string | null; active: boolean;
}
export interface PlaceStats { stories: number; posts: number; planning: number }

const norm = (s: unknown) => String(s ?? '').trim().toLowerCase();
const tally = (rows: Array<{ place_id: string }>) => {
  const out = new Map<string, number>();
  for (const r of rows) out.set(r.place_id, (out.get(r.place_id) ?? 0) + 1);
  return out;
};

async function countsFor(db: any, ids: string[], now: Date) {
  if (ids.length === 0) return new Map<string, PlaceStats>();
  const since = new Date(now.getTime() - TREND_DAYS * 86_400_000).toISOString();
  const [stories, posts, planning] = await Promise.all([
    allRows(() => db.from('club_stories').select('place_id').in('place_id', ids).eq('hidden', false).gt('expires_at', now.toISOString()).order('place_id')),
    allRows(() => db.from('club_posts').select('place_id').in('place_id', ids).eq('hidden', false).is('deleted_at', null).gt('created_at', since).order('place_id')),
    allRows(() => db.from('club_place_follows').select('place_id').in('place_id', ids).order('place_id')),
  ]);
  const s = tally(stories), p = tally(posts), f = tally(planning);
  return new Map(ids.map((id) => [id, { stories: s.get(id) ?? 0, posts: p.get(id) ?? 0, planning: f.get(id) ?? 0 }] as const));
}

async function followedPlaceIds(db: any, userId: string): Promise<Set<string>> {
  const rows = await allRows(() => db.from('club_place_follows').select('place_id').eq('user_id', userId).order('place_id'));
  return new Set(rows.map((r) => r.place_id));
}

async function activePlace(db: any, id: string): Promise<PlaceRow> {
  if (!UUID.test(id)) fail(404, 'Place not found.');
  const row = must(await db.from('club_places').select(PLACE_COLUMNS).eq('id', id).maybeSingle()) as PlaceRow | null;
  if (!row || !row.active) fail(404, 'Place not found.');
  return row;
}

/** A place id from a story or post. Anything not on the list is refused, so names cannot be made up. */
export async function resolvePlace(db: any, id: unknown): Promise<PlaceRow> {
  const value = String(id ?? '');
  if (!UUID.test(value)) fail(400, 'Choose a place from the list.');
  const row = must(await db.from('club_places').select(PLACE_COLUMNS).eq('id', value).maybeSingle()) as PlaceRow | null;
  if (!row || !row.active) fail(400, 'Choose a place from the list.');
  return row;
}

/** The viewer's own city, if it matches a place on the list (for "the place you live"). */
export async function homePlaceIdFor(db: any, city: string | null | undefined): Promise<string | null> {
  const wanted = norm(city);
  if (!wanted) return null;
  const rows = must(await db.from('club_places').select('id, name').eq('active', true).limit(500)) as Array<{ id: string; name: string }>;
  return rows.find((r) => norm(r.name) === wanted)?.id ?? null;
}

export function kindFilter(kind: unknown): string | null {
  return (KINDS as readonly string[]).includes(String(kind)) ? String(kind) : null;
}

export async function listPlaces(db: any, viewerId: string, opts: { region?: string | null; q?: string | null; kind?: string | null; sort?: string | null }, now = new Date()) {
  let query = db.from('club_places').select(PLACE_COLUMNS).eq('active', true);
  if (opts.region) query = query.eq('region', opts.region);
  const rows = must(await query.order('name', { ascending: true }).limit(500)) as PlaceRow[];
  const term = norm(opts.q).slice(0, 60);
  const kind = kindFilter(opts.kind);
  const matches = rows.filter((p) => (!kind || p.kinds.includes(kind))
    && (!term || [p.name, p.country, ...p.kinds].join(' ').toLowerCase().includes(term)));

  const ids = matches.map((p) => p.id);
  const [stats, following, urls] = await Promise.all([
    countsFor(db, ids, now),
    followedPlaceIds(db, viewerId),
    signMedia(db, matches.map((p) => p.cover_path)),
  ]);
  const places = matches.map((p) => {
    const s = stats.get(p.id) ?? { stories: 0, posts: 0, planning: 0 };
    return { ...shape(p, urls), stats: s, planning: following.has(p.id), trend: placeTrendScore(s) };
  });
  places.sort(opts.sort === 'name'
    ? (a, b) => a.name.localeCompare(b.name)
    : (a, b) => b.trend - a.trend || a.name.localeCompare(b.name));
  return { places };
}

function shape(p: PlaceRow, urls: Map<string, string>) {
  return {
    id: p.id, slug: p.slug, name: p.name, region: p.region, country: p.country, kinds: p.kinds, blurb: p.blurb,
    cover: p.cover_path ? urls.get(p.cover_path) ?? null : null,
  };
}

/** One place: its stats, whether you plan to go, and the people planning to go (most recent first). */
export async function placeDetail(db: any, id: string, viewerId: string, now = new Date()) {
  const place = await activePlace(db, id);
  const [stats, following, planners, urls] = await Promise.all([
    countsFor(db, [place.id], now),
    followedPlaceIds(db, viewerId),
    allRows(() => db.from('club_place_follows').select('user_id, created_at').eq('place_id', place.id).order('created_at', { ascending: false })),
    signMedia(db, [place.cover_path]),
  ]);
  const shown = await publicMembers(db, planners.slice(0, FACES).map((p) => p.user_id));
  const memberUrls = await signMedia(db, shown.map((m) => m.avatar_url));
  const order = new Map(planners.map((p, i) => [p.user_id, i] as const));
  const faces = shown
    .sort((a, b) => (order.get(a.user_id) ?? 0) - (order.get(b.user_id) ?? 0))
    .map((m) => ({ user_id: m.user_id, name: m.name, avatar_url: m.avatar_url ? memberUrls.get(m.avatar_url) ?? null : null }));
  return {
    place: shape(place, urls),
    stats: stats.get(place.id) ?? { stories: 0, posts: 0, planning: 0 },
    planning: following.has(place.id),
    planners: { total: planners.length, faces },
  };
}

/** Plan to visit a place, or stop planning. */
export async function setPlaceFollow(db: any, userId: string, placeId: string, on: boolean) {
  await activePlace(db, placeId);
  if (on) {
    const res = await db.from('club_place_follows').insert({ place_id: placeId, user_id: userId });
    if (res.error && res.error.code !== '23505') throw res.error;
  } else {
    must(await db.from('club_place_follows').delete().eq('place_id', placeId).eq('user_id', userId));
  }
  const planners = await allRows(() => db.from('club_place_follows').select('user_id').eq('place_id', placeId).order('user_id'));
  return { planning: on, total: planners.length };
}

export async function placeFollowsOf(db: any, userId: string): Promise<string[]> {
  return Array.from(await followedPlaceIds(db, userId));
}
