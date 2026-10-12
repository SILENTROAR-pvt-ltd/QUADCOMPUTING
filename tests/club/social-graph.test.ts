import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({}) }));

import { clubDb, member, seedMembers } from './fakes';
import { storyScore, placeTrendScore, WEIGHTS, type RankContext } from '@/lib/club/social/ranking';
import { followCounts, networkOf, setFollow } from '@/lib/club/social/follow.service';
import { homePlaceIdFor, listPlaces, placeDetail, resolvePlace, setPlaceFollow } from '@/lib/club/social/places.service';
import { placeStories, recordStoryView, storyTray, storyViewers } from '@/lib/club/stories.service';
import { createPost, listPosts } from '@/lib/club/room/posts.service';

const A = '77777777-aaaa-4bbb-8ccc-00000000000a';
const B = '77777777-aaaa-4bbb-8ccc-00000000000b';
const C = '77777777-aaaa-4bbb-8ccc-00000000000c';
const D = '77777777-aaaa-4bbb-8ccc-00000000000d';
const PENDING = '77777777-aaaa-4bbb-8ccc-0000000000ee';
const GOA = '88888888-aaaa-4bbb-8ccc-00000000000a';
const MANALI = '88888888-aaaa-4bbb-8ccc-00000000000b';
const OLD = '88888888-aaaa-4bbb-8ccc-00000000000c';
const PARIS = '88888888-aaaa-4bbb-8ccc-00000000000d';
const CLOSED = '88888888-aaaa-4bbb-8ccc-00000000000e';
const NOW = new Date('2026-10-12T10:00:00Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

const place = (id: string, slug: string, name: string, region: string, country: string, kinds: string[], active = true) => ({
  id, slug, name, region, country, kinds, blurb: null, cover_path: null, active, created_at: hoursAgo(0),
});
const PLACES = [
  place(GOA, 'goa', 'Goa', 'india', 'India', ['beach', 'nightlife']),
  place(MANALI, 'manali', 'Manali', 'india', 'India', ['mountains', 'adventure']),
  place(OLD, 'old-manali', 'Old Manali', 'india', 'India', ['mountains', 'nature', 'food']),
  place(PARIS, 'paris', 'Paris', 'europe', 'France', ['city', 'food']),
  place(CLOSED, 'closed', 'Closed Place', 'india', 'India', [], false),
];

const story = (id: string, user: string, over: Record<string, unknown> = {}) => ({
  id, user_id: user, media_path: `stories/${user}/${id}.jpg`, media_type: 'image', caption: null, verified_stay: false,
  stay_business_id: null, hidden: false, place_id: null, expires_at: hoursAgo(-20), created_at: hoursAgo(1), ...over,
});

function db(extra: Record<string, any[]> = {}) {
  const a = member(A, '@asha', { city: 'Goa' });
  const b = member(B, '@bilal', { city: 'Pune' });
  const c = member(C, '@chet', { city: 'Goa' });
  const d = member(D, '@dev', { city: 'Delhi' });
  const db = clubDb({
    ...seedMembers(a, b, c, d),
    club_places: PLACES, club_place_follows: [], club_follows: [], club_story_views: [], club_stories: [],
    club_posts: [], club_post_likes: [], club_post_comments: [], club_events: [], club_event_participants: [],
    club_event_interest: [], club_notifications: [], club_presence: [], club_reports: [], club_moderation_log: [],
    ...extra,
  });
  return { db, profiles: { a: a.profile as any, b: b.profile as any, c: c.profile as any, d: d.profile as any } };
}

describe('Ranking rules', () => {
  const ctx: RankContext = { viewerId: A, followees: new Set([B]), followedPlaces: new Set([MANALI]), homePlaceId: OLD, now: NOW.getTime() };
  const at = (h: number) => NOW.getTime() - h * 3_600_000;

  it('people you follow beat strangers, and places you plan to visit beat ordinary stories', () => {
    const stranger = storyScore({ authorId: C, placeId: null, postedAt: at(1), seen: true }, ctx);
    const followed = storyScore({ authorId: B, placeId: null, postedAt: at(1), seen: true }, ctx);
    const planned = storyScore({ authorId: C, placeId: MANALI, postedAt: at(1), seen: true }, ctx);
    expect(followed).toBeGreaterThan(planned);
    expect(planned).toBeGreaterThan(stranger);
  });

  it('unseen stories rank above seen ones by exactly the unseen weight', () => {
    const unseen = storyScore({ authorId: C, placeId: null, postedAt: at(1), seen: false }, ctx);
    const seen = storyScore({ authorId: C, placeId: null, postedAt: at(1), seen: true }, ctx);
    expect(unseen - seen).toBeCloseTo(WEIGHTS.unseen, 6);
  });

  it('recency fades across the day, and a story older than a day earns no recency', () => {
    const fresh = storyScore({ authorId: C, placeId: null, postedAt: at(1), seen: true }, ctx);
    const stale = storyScore({ authorId: C, placeId: null, postedAt: at(30), seen: true }, ctx);
    expect(fresh).toBeGreaterThan(0);
    expect(stale).toBe(0);
  });

  it('a place trend counts live stories, recent posts and people planning to go', () => {
    expect(placeTrendScore({ stories: 2, posts: 1, planning: 3 })).toBe(2 * WEIGHTS.trendStory + WEIGHTS.trendPost + 3 * WEIGHTS.trendPlanning);
  });
});

describe('Follows', () => {
  it('follows are one-way and counted, and you cannot follow yourself', async () => {
    const { db: d, profiles } = db();
    await expect(setFollow(d, profiles.a, A, true)).rejects.toMatchObject({ status: 400 });
    expect(await setFollow(d, profiles.a, B, true)).toMatchObject({ following: true, counts: { followers: 1, following: 0 } });
    await setFollow(d, profiles.a, B, true);
    expect(await followCounts(d, A)).toEqual({ followers: 0, following: 1 });
    expect(await followCounts(d, B)).toEqual({ followers: 1, following: 0 });
    await setFollow(d, profiles.a, B, false);
    expect(await followCounts(d, B)).toEqual({ followers: 0, following: 0 });
  });

  it('only approved members can be followed', async () => {
    const { db: d, profiles } = db();
    const pending = member(PENDING, '@pending', { status: 'pending' });
    d.tables.viber_profiles.push(pending.profile);
    d.tables.vibers_accounts.push(pending.account);
    await expect(setFollow(d, profiles.a, PENDING, true)).rejects.toMatchObject({ status: 404 });
  });

  it('lists followers and following, and says which of them you follow', async () => {
    const { db: d, profiles } = db();
    await setFollow(d, profiles.a, B, true);
    await setFollow(d, profiles.c, B, true);
    await setFollow(d, profiles.b, A, true);
    const followers = await networkOf(d, B, A, 'followers');
    expect(followers.map((m) => m.name).sort()).toEqual(['Asha', 'Chet']);
    expect(followers.find((m) => m.user_id === C)?.follows).toBe(false);
    const following = await networkOf(d, A, A, 'following');
    expect(following.map((m) => m.name)).toEqual(['Bilal']);
    expect(following[0].follows).toBe(true);
  });
});

describe('Places', () => {
  it('lists active places for a region, filtered by search and kind, and never a closed place', async () => {
    const { db: d } = db();
    const india = await listPlaces(d, A, { region: 'india' }, NOW);
    expect(india.places.map((p) => p.name)).not.toContain('Closed Place');
    expect((await listPlaces(d, A, { region: 'india', kind: 'beach' }, NOW)).places.map((p) => p.name)).toEqual(['Goa']);
    expect((await listPlaces(d, A, { q: 'manali' }, NOW)).places.map((p) => p.name).sort()).toEqual(['Manali', 'Old Manali']);
    expect((await listPlaces(d, A, { kind: 'DROP TABLE' }, NOW)).places.length).toBe(4);
  });

  it('ranks places by live stories, recent posts and people planning to go', async () => {
    const { db: d } = db({
      club_stories: [
        story('s1', B, { place_id: MANALI }),
        story('s2', C, { place_id: MANALI }),
        story('s-old', C, { place_id: MANALI, expires_at: hoursAgo(1) }),
        story('s-hidden', D, { place_id: MANALI, hidden: true }),
      ],
      club_posts: [
        { id: 'p-new', author_id: B, body: 'x', place: 'Manali', place_id: MANALI, region: 'india', event_id: null, hidden: false, deleted_at: null, created_at: hoursAgo(10) },
        { id: 'p-old', author_id: B, body: 'y', place: 'Manali', place_id: MANALI, region: 'india', event_id: null, hidden: false, deleted_at: null, created_at: hoursAgo(24 * 9) },
      ],
    });
    await setPlaceFollow(d, D, MANALI, true);
    const res = await listPlaces(d, A, { region: 'india' }, NOW);
    expect(res.places[0]).toMatchObject({ name: 'Manali', stats: { stories: 2, posts: 1, planning: 1 } });
    expect(res.places[0].trend).toBe(2 * WEIGHTS.trendStory + 1 * WEIGHTS.trendPost + 1 * WEIGHTS.trendPlanning);
  });

  it('planning to go toggles, and the place page shows who is planning', async () => {
    const { db: d } = db();
    expect(await setPlaceFollow(d, A, GOA, true)).toEqual({ planning: true, total: 1 });
    const detail = await placeDetail(d, GOA, A, NOW);
    expect(detail.planning).toBe(true);
    expect(detail.planners.faces.map((f) => f.name)).toEqual(['Asha']);
    expect(await setPlaceFollow(d, A, GOA, false)).toEqual({ planning: false, total: 0 });
  });

  it('closed or unknown places cannot be followed or viewed', async () => {
    const { db: d } = db();
    await expect(setPlaceFollow(d, A, CLOSED, true)).rejects.toMatchObject({ status: 404 });
    await expect(placeDetail(d, '00000000-0000-4000-8000-000000000000', A, NOW)).rejects.toMatchObject({ status: 404 });
  });

  it('a story or post can only use a place from the list', async () => {
    const { db: d } = db();
    await expect(resolvePlace(d, 'Goa')).rejects.toMatchObject({ status: 400 });
    await expect(resolvePlace(d, CLOSED)).rejects.toMatchObject({ status: 400 });
    expect((await resolvePlace(d, GOA)).name).toBe('Goa');
  });

  it('matches your city to a listed place, so you see stories from where you live', async () => {
    const { db: d } = db();
    expect(await homePlaceIdFor(d, 'Goa')).toBe(GOA);
    expect(await homePlaceIdFor(d, 'Pune')).toBeNull();
    expect(await homePlaceIdFor(d, '')).toBeNull();
  });
});

describe('Story tray', () => {
  it('ranks people you follow first, then places you plan to visit, unseen first', async () => {
    const { db: d, profiles } = db({
      club_stories: [
        story('s-b', B, { created_at: hoursAgo(3) }),
        story('s-c', C, { place_id: MANALI, created_at: hoursAgo(2) }),
        story('s-d', D, { created_at: hoursAgo(1) }),
      ],
    });
    await setFollow(d, profiles.a, B, true);
    await setPlaceFollow(d, A, MANALI, true);
    const tray = await storyTray(d, A, null, NOW);
    expect(tray.mine).toBeNull();
    expect(tray.groups.map((g) => g.member.name)).toEqual(['Bilal', 'Chet', 'Dev']);
  });

  it('your own stories come first, with how many people watched them', async () => {
    const { db: d } = db({ club_stories: [story('s-a', A)] });
    await recordStoryView(d, B, 's-a', NOW);
    await recordStoryView(d, C, 's-a', NOW);
    const tray = await storyTray(d, A, null, NOW);
    expect(tray.mine?.member.name).toBe('Asha');
    expect(tray.mine?.stories[0]).toMatchObject({ mine: true, viewers: 2 });
    expect(tray.groups).toEqual([]);
  });

  it('a view counts once, your own views do not count, and only the author sees who watched', async () => {
    const { db: d } = db({ club_stories: [story('s-b', B)] });
    await recordStoryView(d, C, 's-b', NOW);
    await recordStoryView(d, C, 's-b', NOW);
    await recordStoryView(d, B, 's-b', NOW);
    const seenByC = await storyTray(d, C, null, NOW);
    expect(seenByC.groups[0].stories[0].seen).toBe(true);
    expect(seenByC.groups[0].seen).toBe(true);
    const viewers = await storyViewers(d, 's-b', B);
    expect(viewers.count).toBe(1);
    expect(viewers.viewers.map((v) => v.name)).toEqual(['Chet']);
    await expect(storyViewers(d, 's-b', C)).rejects.toMatchObject({ status: 404 });
  });

  it('expired stories leave the tray, and a hidden author is seen only by themself', async () => {
    const { db: d } = db({
      club_stories: [
        story('s-gone', B, { expires_at: hoursAgo(1) }),
        story('s-hidden', C, { hidden: true }),
      ],
    });
    expect((await storyTray(d, A, null, NOW)).groups).toEqual([]);
    expect((await storyTray(d, C, null, NOW)).mine?.stories[0].id).toBe('s-hidden');
    await expect(recordStoryView(d, A, 's-hidden', NOW)).rejects.toMatchObject({ status: 404 });
  });

  it('a place page shows only that place, with people you follow first', async () => {
    const { db: d, profiles } = db({
      club_stories: [
        story('m-c', C, { place_id: MANALI, created_at: hoursAgo(2) }),
        story('m-b', B, { place_id: MANALI, created_at: hoursAgo(4) }),
        story('goa-b', B, { place_id: GOA }),
      ],
    });
    await setFollow(d, profiles.a, B, true);
    const groups = await placeStories(d, MANALI, A, null, NOW);
    expect(groups.map((g) => g.member.name)).toEqual(['Bilal', 'Chet']);
    expect(groups.flatMap((g) => g.stories).every((s) => s.place?.name === 'Manali')).toBe(true);
  });
});

describe('Place posts and the following feed', () => {
  it('a post takes its place name and region from the list, and the place feed shows only that place', async () => {
    const { db: d, profiles } = db();
    const post = await createPost(d, profiles.a, { body: 'Who is up for Manali?', place_id: MANALI });
    expect(post).toMatchObject({ place: 'Manali', place_id: MANALI, region: 'india' });
    await expect(createPost(d, profiles.a, { body: 'x', place_id: 'Atlantis' })).rejects.toMatchObject({ status: 400 });
    const feed = await listPosts(d, A, { placeId: MANALI }, NOW);
    expect(feed.posts.map((p) => p.id)).toEqual([post.id]);
  });

  it('the following feed shows only people you follow, and you', async () => {
    const { db: d, profiles } = db();
    await createPost(d, profiles.a, { body: 'mine' });
    await createPost(d, profiles.b, { body: 'bilal' });
    await createPost(d, profiles.c, { body: 'chet' });
    await setFollow(d, profiles.a, B, true);
    const feed = await listPosts(d, A, { following: true }, NOW);
    expect(feed.posts.map((p) => p.author.name).sort()).toEqual(['Asha', 'Bilal']);
  });
});
