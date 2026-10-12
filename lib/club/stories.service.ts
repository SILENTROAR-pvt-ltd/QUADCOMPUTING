// Stories: 24-hour images or short clips, tagged with a place. Each viewer gets them ranked: people
// they follow, places they plan to visit, the place they live, unseen first, newest first. Viewers
// leave a receipt, so the author can see who watched (only the author can, and only the count is public).
import { fail, must } from './http';
import { maskProfanity } from './identity/profanity';
import { currentPartnerStay } from './qc-bridge';
import { publicMembers } from './membership/members';
import { signMedia } from './media';
import { allRows } from './rows';
import { followingIds } from './social/follow.service';
import { placeFollowsOf, resolvePlace } from './social/places.service';
import { groupScore, storyScore, type RankableStory, type RankContext } from './social/ranking';
import type { ViberProfile } from './types';

const LIVE_LIMIT = 300;
const STORY_COLUMNS = 'id, user_id, media_path, media_type, caption, verified_stay, hidden, place_id, expires_at, created_at';
const VIEWERS_LIMIT = 500;

interface StoryRow {
  id: string; user_id: string; media_path: string; media_type: 'image' | 'video'; caption: string | null;
  verified_stay: boolean; hidden: boolean; place_id: string | null; expires_at: string; created_at: string;
}

export async function postStory(db: any, author: ViberProfile, body: Record<string, any>) {
  const path = typeof body.media_path === 'string' ? body.media_path : '';
  if (!path.startsWith(`stories/${author.user_id}/`)) fail(400, 'Upload the photo or clip first.');
  const mediaType = /\.(mp4|webm|mov)$/i.test(path) ? 'video' : 'image';
  const caption = typeof body.caption === 'string' ? maskProfanity(body.caption.trim()).slice(0, 300) || null : null;
  const place = body.place_id ? await resolvePlace(db, body.place_id) : null;
  const stay = await currentPartnerStay(db, author.viber_id, author.phone);
  return must(await db.from('club_stories').insert({
    user_id: author.user_id, media_path: path, media_type: mediaType, caption, place_id: place?.id ?? null,
    verified_stay: Boolean(stay), stay_business_id: stay, hidden: Boolean(author.shadow_banned),
    expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
  }).select('id, media_type, caption, verified_stay, place_id, expires_at, created_at').single());
}

const liveStories = (db: any, now: Date) =>
  db.from('club_stories').select(STORY_COLUMNS).gt('expires_at', now.toISOString()).order('created_at', { ascending: false }).limit(LIVE_LIMIT);

/** Everything a viewer needs to rank: who they follow, which places they plan to visit, where they live. */
async function contextFor(db: any, viewerId: string, homePlaceId: string | null, now: Date): Promise<RankContext> {
  const [followees, placeIds] = await Promise.all([followingIds(db, viewerId), placeFollowsOf(db, viewerId)]);
  return { viewerId, followees: new Set(followees), followedPlaces: new Set(placeIds), homePlaceId, now: now.getTime() };
}

/** Turns live story rows into one group per person: who they are, their stories (oldest first), and a rank. */
async function groupsFor(db: any, viewerId: string, rows: StoryRow[], ctx: RankContext) {
  const visible = rows.filter((s) => !s.hidden || s.user_id === viewerId);
  const ids = visible.map((s) => s.id);
  const views = ids.length
    ? await allRows(() => db.from('club_story_views').select('story_id, viewer_id').in('story_id', ids).order('story_id'))
    : [];
  const seenByMe = new Set(views.filter((v) => v.viewer_id === viewerId).map((v) => v.story_id));
  const viewCount = new Map<string, number>();
  for (const v of views) viewCount.set(v.story_id, (viewCount.get(v.story_id) ?? 0) + 1);

  const authors = new Map((await publicMembers(db, visible.map((s) => s.user_id))).map((m) => [m.user_id, m]));
  const placeIds = Array.from(new Set(visible.map((s) => s.place_id).filter((x): x is string => Boolean(x))));
  const places = placeIds.length
    ? new Map((must(await db.from('club_places').select('id, name, region, country').in('id', placeIds)) as any[]).map((p) => [p.id, p]))
    : new Map();
  const urls = await signMedia(db, [...visible.map((s) => s.media_path), ...Array.from(authors.values()).map((a) => a.avatar_url)]);

  const groups = new Map<string, { member: any; items: Array<{ story: any; rank: RankableStory }> }>();
  for (const s of visible) {
    const member = authors.get(s.user_id);
    if (!member) continue;
    const mine = s.user_id === viewerId;
    const seen = mine || seenByMe.has(s.id);
    const place = s.place_id ? places.get(s.place_id) ?? null : null;
    const story = {
      id: s.id, media_type: s.media_type, url: urls.get(s.media_path) ?? null, caption: s.caption, verified_stay: s.verified_stay,
      created_at: s.created_at, expires_at: s.expires_at, mine, seen,
      place: place ? { id: place.id, name: place.name, region: place.region, country: place.country } : null,
      viewers: mine ? viewCount.get(s.id) ?? 0 : undefined,
    };
    const rank: RankableStory = { authorId: s.user_id, placeId: s.place_id, postedAt: Date.parse(s.created_at), seen };
    if (!groups.has(s.user_id)) {
      groups.set(s.user_id, {
        member: { ...member, avatar_url: member.avatar_url ? urls.get(member.avatar_url) ?? null : null },
        items: [],
      });
    }
    groups.get(s.user_id)!.items.push({ story, rank });
  }

  return Array.from(groups.values()).map((g) => {
    const ranks = g.items.map((i) => i.rank);
    const stories = g.items.map((i) => i.story).sort((a, b) => a.created_at.localeCompare(b.created_at));
    return {
      member: g.member,
      stories,
      mine: g.member.user_id === viewerId,
      seen: stories.every((s) => s.seen),
      latest: stories[stories.length - 1].created_at,
      score: groupScore(ranks, ctx),
      bestStory: g.items.reduce((best, i) => Math.max(best, storyScore(i.rank, ctx)), 0),
    };
  });
}

const publicGroup = ({ score: _score, bestStory: _best, ...rest }: any) => rest;

/** The story tray on the club home: your own first, then everyone else in ranked order. */
export async function storyTray(db: any, viewerId: string, homePlaceId: string | null, now = new Date()) {
  const ctx = await contextFor(db, viewerId, homePlaceId, now);
  const rows = must(await liveStories(db, now)) as StoryRow[];
  const groups = await groupsFor(db, viewerId, rows, ctx);
  const mine = groups.find((g) => g.mine) ?? null;
  const others = groups
    .filter((g) => !g.mine)
    .sort((a, b) => b.score - a.score || b.latest.localeCompare(a.latest));
  return { mine: mine ? publicGroup(mine) : null, groups: others.map(publicGroup) };
}

/** Live stories tagged with one place, ranked for this viewer (people they follow first). */
export async function placeStories(db: any, placeId: string, viewerId: string, homePlaceId: string | null, now = new Date()) {
  const ctx = await contextFor(db, viewerId, homePlaceId, now);
  const rows = must(await liveStories(db, now).eq('place_id', placeId)) as StoryRow[];
  const groups = await groupsFor(db, viewerId, rows, ctx);
  return groups.sort((a, b) => b.score - a.score || b.latest.localeCompare(a.latest)).map(publicGroup);
}

/** Records that a viewer watched a story. Once per viewer; your own views do not count. */
export async function recordStoryView(db: any, viewerId: string, storyId: string, now = new Date()) {
  const story = must(await db.from('club_stories').select('id, user_id, hidden, expires_at').eq('id', storyId).maybeSingle());
  if (!story || Date.parse(story.expires_at) <= now.getTime()) fail(404, 'Story not found.');
  if (story.hidden && story.user_id !== viewerId) fail(404, 'Story not found.');
  if (story.user_id === viewerId) return;
  const res = await db.from('club_story_views').insert({ story_id: storyId, viewer_id: viewerId, viewed_at: now.toISOString() });
  if (res.error && res.error.code !== '23505') throw res.error;
}

/** Who watched your story, newest first. Only the author can ask. */
export async function storyViewers(db: any, storyId: string, ownerId: string) {
  const story = must(await db.from('club_stories').select('id, user_id').eq('id', storyId).maybeSingle());
  if (!story || story.user_id !== ownerId) fail(404, 'Story not found.');
  const views = must(await db.from('club_story_views').select('viewer_id, viewed_at').eq('story_id', storyId)
    .order('viewed_at', { ascending: false }).limit(VIEWERS_LIMIT)) as Array<{ viewer_id: string; viewed_at: string }>;
  const members = new Map((await publicMembers(db, views.map((v) => v.viewer_id))).map((m) => [m.user_id, m]));
  const urls = await signMedia(db, Array.from(members.values()).map((m) => m.avatar_url));
  return {
    count: views.length,
    viewers: views.flatMap((v) => {
      const m = members.get(v.viewer_id);
      return m ? [{ ...m, avatar_url: m.avatar_url ? urls.get(m.avatar_url) ?? null : null, viewed_at: v.viewed_at }] : [];
    }),
  };
}

export async function deleteStory(db: any, userId: string, storyId: string) {
  const rows = must(await db.from('club_stories').update({ expires_at: new Date().toISOString() })
    .eq('id', storyId).eq('user_id', userId).select('id')) as any[];
  if (rows.length === 0) fail(404, 'Story not found.');
}
