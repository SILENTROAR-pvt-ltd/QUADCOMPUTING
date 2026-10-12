// Instant meetups and the Explore feed: validation, posting (live at once, no review), RSVPs and
// capacity, cancelling, the search and filters, and moderation.
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({}) }));

import { clubDb, member, seedMembers } from './fakes';
import { cleanCovers, parseMeetup } from '@/lib/club/meetups/meetup-input';
import { cancelMeetup, createMeetup, joinMeetup, leaveMeetup, listMeetups, meetupView } from '@/lib/club/meetups/meetups.service';
import { exploreFeed } from '@/lib/club/explore/explore.service';
import { myActivity } from '@/lib/club/explore/activity.service';
import { nearestPlace, PLACE_COORDS } from '@/lib/club/social/place-coords';
import { actOnMember, hideContent } from '@/lib/club/moderation/actions.service';
import { fileReport } from '@/lib/club/moderation/reports.service';

const A = '99999999-aaaa-4bbb-8ccc-00000000000a';
const B = '99999999-aaaa-4bbb-8ccc-00000000000b';
const C = '99999999-aaaa-4bbb-8ccc-00000000000c';
const STAFF = '99999999-aaaa-4bbb-8ccc-0000000000ff';
const MANALI = '88888888-aaaa-4bbb-8ccc-00000000000b';
const CLOSED = '88888888-aaaa-4bbb-8ccc-00000000000e';
const NOW = new Date('2026-10-12T10:00:00Z');
const hours = (h: number) => new Date(NOW.getTime() + h * 3_600_000).toISOString();

const body = (over: Record<string, unknown> = {}) => ({ kind: 'coffee', title: 'Chai at Cafe 1947', city: 'Manali', when: 'now', hours: 2, ...over });
const place = (id: string, name: string, active = true) => ({ id, slug: name.toLowerCase(), name, region: 'india', country: 'India', kinds: [], blurb: null, cover_path: null, active, created_at: hours(0) });
const plan = (id: string, over: Record<string, unknown> = {}) => ({
  id, creator_id: B, title: 'Old Manali trek', kind: 'tour', cover_paths: [], starts_at: hours(48), ends_at: hours(96), venue: 'Old Manali',
  transport: null, food: null, activities: null, budget: [], cancellation_policy: 'x', safety_protocol: 'y', price_min: 0, price_max: 0, capacity: 12,
  ticket_price: 450000, payment_schedule: [], fee_bps: null, status: 'approved', verified: true, review_note: null, created_at: hours(0), ...over,
});

function db(extra: Record<string, any[]> = {}) {
  const a = member(A, '@asha', { city: 'Goa' }), b = member(B, '@bilal', { city: 'Pune' }), c = member(C, '@chet', { city: 'Manali' });
  const d = clubDb({
    ...seedMembers(a, b, c),
    club_places: [place(MANALI, 'Manali'), place(CLOSED, 'Closed', false)],
    club_meetups: [], club_meetup_members: [], club_notifications: [], club_events: [], club_event_participants: [], club_event_interest: [],
    club_reports: [], club_moderation_log: [], club_stories: [], club_posts: [], club_presence: [],
    ...extra,
  });
  return { d, p: { a: a.profile as any, b: b.profile as any, c: c.profile as any } };
}

describe('Meetup validation', () => {
  it('accepts a minimal meetup that starts now and lasts two hours', () => {
    const r = parseMeetup(body(), NOW);
    expect(r).toMatchObject({ ok: true, row: { kind: 'coffee', title: 'Chai at Cafe 1947', city: 'Manali', capacity: null, starts_at: NOW.toISOString(), ends_at: hours(2) } });
  });

  it('refuses a missing kind, a short title, no location, rude words, and bad spots or length', () => {
    expect(parseMeetup(body({ kind: 'rave' }), NOW).ok).toBe(false);
    expect(parseMeetup(body({ title: 'ab' }), NOW).ok).toBe(false);
    expect(parseMeetup(body({ city: '' }), NOW).ok).toBe(false);
    expect(parseMeetup(body({ note: 'what the fuck' }), NOW).ok).toBe(false);
    expect(parseMeetup(body({ capacity: 1 }), NOW).ok).toBe(false);
    expect(parseMeetup(body({ hours: 13 }), NOW).ok).toBe(false);
    expect(parseMeetup(body({ capacity: '' }), NOW)).toMatchObject({ ok: true, row: { capacity: null } });
  });

  it('a later start must be in the next two weeks and not already past', () => {
    expect(parseMeetup(body({ when: 'later', starts_at: hours(5) }), NOW)).toMatchObject({ ok: true, row: { starts_at: hours(5) } });
    expect(parseMeetup(body({ when: 'later', starts_at: hours(-3) }), NOW).ok).toBe(false);
    expect(parseMeetup(body({ when: 'later', starts_at: hours(24 * 15) }), NOW).ok).toBe(false);
    expect(parseMeetup(body({ when: 'later', starts_at: 'soon' }), NOW).ok).toBe(false);
  });
});

describe('Posting a meetup', () => {
  it('goes live at once with no review, and the host counts as going', async () => {
    const { d, p } = db();
    const card = await createMeetup(d, p.a, body(), NOW);
    expect(card).toMatchObject({ status: 'open', live: true, going: 1, me: { hosting: true, going: true }, host: { user_id: A } });
    expect(d.tables.club_meetups).toHaveLength(1);
    expect(d.tables.club_meetup_members).toEqual([expect.objectContaining({ meetup_id: card.id, user_id: A })]);
  });

  it('a listed place names the city; a place that is not listed is refused', async () => {
    const { d, p } = db();
    expect(await createMeetup(d, p.a, body({ city: 'somewhere', place_id: MANALI }), NOW)).toMatchObject({ city: 'Manali', place_id: MANALI });
    await expect(createMeetup(d, p.b, body({ place_id: CLOSED }), NOW)).rejects.toMatchObject({ status: 400 });
  });

  it('a member can have three running at once; one that has ended no longer counts', async () => {
    const { d, p } = db();
    for (let i = 0; i < 3; i++) await createMeetup(d, p.a, body({ title: `Meetup ${i}` }), NOW);
    await expect(createMeetup(d, p.a, body({ title: 'One more' }), NOW)).rejects.toMatchObject({ status: 409, code: 'meetup_limit' });
    expect(await createMeetup(d, p.a, body({ title: 'After they end' }), new Date(NOW.getTime() + 3 * 3_600_000))).toMatchObject({ status: 'open' });
  });

  it('keeps up to four photos, and only ones the host uploaded to their own folder', async () => {
    const { d, p } = db();
    const mine = (n: number) => `meetups/${A}/pic${n}.jpg`;
    await createMeetup(d, p.a, body({ cover_paths: [mine(1), `meetups/${B}/theirs.jpg`, `events/${A}/other-kind.jpg`, `meetups/${A}/../${B}/x.jpg`, mine(1), mine(2), mine(3), mine(4), mine(5)] }), NOW);
    expect(d.tables.club_meetups[0].cover_paths).toEqual([mine(1), mine(2), mine(3), mine(4)]);
    expect(cleanCovers('not a list', A)).toEqual([]);
  });

  it('a meetup set for later is not live yet', async () => {
    const { d, p } = db();
    expect(await createMeetup(d, p.a, body({ when: 'later', starts_at: hours(3) }), NOW)).toMatchObject({ live: false, status: 'open' });
  });
});

describe('RSVPs', () => {
  it('"I\'m in" adds you once and tells the host', async () => {
    const { d, p } = db();
    const m = await createMeetup(d, p.a, body(), NOW);
    expect(await joinMeetup(d, m.id, p.b, NOW)).toMatchObject({ going: 2, me: { going: true, hosting: false } });
    await joinMeetup(d, m.id, p.b, NOW);
    expect(d.tables.club_meetup_members).toHaveLength(2);
    expect(d.tables.club_notifications).toEqual([expect.objectContaining({ user_id: A, kind: 'meetup', link: `/club/meetups/${m.id}` })]);
  });

  it('stops at capacity, and refuses once the meetup has ended', async () => {
    const { d, p } = db();
    const m = await createMeetup(d, p.a, body({ capacity: 2 }), NOW);
    await joinMeetup(d, m.id, p.b, NOW);
    await expect(joinMeetup(d, m.id, p.c, NOW)).rejects.toMatchObject({ status: 409, code: 'meetup_full' });
    await expect(joinMeetup(d, m.id, p.c, new Date(NOW.getTime() + 3 * 3_600_000))).rejects.toMatchObject({ status: 409, code: 'meetup_ended' });
  });

  it('you can leave, but the host must cancel instead', async () => {
    const { d, p } = db();
    const m = await createMeetup(d, p.a, body(), NOW);
    await joinMeetup(d, m.id, p.b, NOW);
    expect(await leaveMeetup(d, m.id, B, NOW)).toMatchObject({ going: 1, me: { going: false } });
    await expect(leaveMeetup(d, m.id, A, NOW)).rejects.toMatchObject({ status: 400 });
  });

  it('only the host (or staff) cancels, and everyone who was in is told', async () => {
    const { d, p } = db();
    const m = await createMeetup(d, p.a, body(), NOW);
    await joinMeetup(d, m.id, p.b, NOW);
    d.tables.club_notifications.length = 0;
    await expect(cancelMeetup(d, m.id, C, false, NOW)).rejects.toMatchObject({ status: 403 });
    expect(await cancelMeetup(d, m.id, A, false, NOW)).toMatchObject({ status: 'cancelled' });
    expect(d.tables.club_notifications).toEqual([expect.objectContaining({ user_id: B, title: 'Meetup cancelled' })]);
    await expect(joinMeetup(d, m.id, p.c, NOW)).rejects.toMatchObject({ status: 404 });
    expect(await listMeetups(d, C, {}, NOW)).toEqual([]);
  });

  it('the meetup page lists who is in, host first', async () => {
    const { d, p } = db();
    const m = await createMeetup(d, p.a, body(), NOW);
    await joinMeetup(d, m.id, p.b, NOW);
    const view = await meetupView(d, m.id, B, false, NOW);
    expect(view.attendees.map((x) => [x.user_id, x.host])).toEqual([[A, true], [B, false]]);
  });
});

describe('Explore feed', () => {
  async function seeded() {
    const { d, p } = db({ club_events: [plan('e1'), plan('e2', { title: 'Draft trek', status: 'submitted' }), plan('e3', { title: 'Goa party night', kind: 'event', venue: 'Anjuna, Goa', starts_at: hours(30), ends_at: hours(34) })] });
    await createMeetup(d, p.a, body({ title: 'Chai at Cafe 1947', note: 'Bring a book', venue: 'Cafe 1947' }), NOW);
    await createMeetup(d, p.c, body({ kind: 'dev', title: 'Dev meet', city: 'Pune', when: 'later', starts_at: hours(5) }), NOW);
    await createMeetup(d, p.c, body({ kind: 'walk', title: 'Sunrise walk', when: 'later', starts_at: hours(20), city: 'Manali' }), NOW);
    return { d, p };
  }

  it('shows approved plans and live meetups together, never a plan still in review, live ones first', async () => {
    const { d } = await seeded();
    const feed = await exploreFeed(d, B, {}, NOW);
    expect(feed.items.map((i) => i.title)).toEqual(['Chai at Cafe 1947', 'Dev meet', 'Sunrise walk', 'Goa party night', 'Old Manali trek']);
    expect(feed.items[0]).toMatchObject({ source: 'meetup', live: true });
    expect(feed.items.find((i) => i.title === 'Old Manali trek')).toMatchObject({ source: 'plan', type: 'trip', price: 450000 });
    expect(feed.items.some((i) => i.title === 'Draft trek')).toBe(false);
  });

  it('filters by type', async () => {
    const { d } = await seeded();
    expect((await exploreFeed(d, B, { type: 'trip' }, NOW)).items.map((i) => i.title)).toEqual(['Old Manali trek']);
    expect((await exploreFeed(d, B, { type: 'event' }, NOW)).items.map((i) => i.title)).toEqual(['Goa party night']);
    expect((await exploreFeed(d, B, { type: 'dev' }, NOW)).items.map((i) => i.title)).toEqual(['Dev meet']);
  });

  it('filters by where it is, across meetups and plans', async () => {
    const { d } = await seeded();
    expect((await exploreFeed(d, B, { location: 'manali' }, NOW)).items.map((i) => i.title)).toEqual(['Chai at Cafe 1947', 'Sunrise walk', 'Old Manali trek']);
    expect((await exploreFeed(d, B, { location: 'pune' }, NOW)).items.map((i) => i.title)).toEqual(['Dev meet']);
    expect((await exploreFeed(d, B, { location: 'anjuna' }, NOW)).items.map((i) => i.title)).toEqual(['Goa party night']);
  });

  it('searches titles, notes, hosts and kinds', async () => {
    const { d } = await seeded();
    expect((await exploreFeed(d, B, { q: 'book' }, NOW)).items.map((i) => i.title)).toEqual(['Chai at Cafe 1947']);
    expect((await exploreFeed(d, B, { q: 'chet' }, NOW)).items.map((i) => i.title)).toEqual(['Dev meet', 'Sunrise walk']);
    expect((await exploreFeed(d, B, { q: 'developer' }, NOW)).items.map((i) => i.title)).toEqual(['Dev meet']);
  });

  it('can show only what is live now, or only what starts before a time', async () => {
    const { d } = await seeded();
    expect((await exploreFeed(d, B, { live: true }, NOW)).items.map((i) => i.title)).toEqual(['Chai at Cafe 1947']);
    expect((await exploreFeed(d, B, { until: hours(6) }, NOW)).items.map((i) => i.title)).toEqual(['Chai at Cafe 1947', 'Dev meet']);
  });

  it('says where you stand: hosting, or going', async () => {
    const { d, p } = await seeded();
    const [first] = (await exploreFeed(d, B, {}, NOW)).items;
    await joinMeetup(d, first.id, p.b, NOW);
    expect((await exploreFeed(d, B, {}, NOW)).items[0].me).toEqual({ hosting: false, going: true });
    expect((await exploreFeed(d, A, {}, NOW)).items[0].me).toEqual({ hosting: true, going: true });
  });

  it('leaves out a meetup that has ended', async () => {
    const { d } = await seeded();
    const later = new Date(NOW.getTime() + 3 * 3_600_000);
    expect((await exploreFeed(d, B, {}, later)).items.map((i) => i.title)).not.toContain('Chai at Cafe 1947');
  });
});

describe('Moderation of meetups', () => {
  it('staff can hide a reported meetup; it leaves the lists and its page for everyone but host and staff', async () => {
    const { d, p } = db();
    const m = await createMeetup(d, p.a, body(), NOW);
    expect(await fileReport(d, B, { target_type: 'meetup', target_id: m.id, reason: 'Looks like spam' })).toEqual({ duplicate: false });
    await hideContent(d, STAFF, 'meetup', m.id);
    expect(await listMeetups(d, B, {}, NOW)).toEqual([]);
    await expect(meetupView(d, m.id, B, false, NOW)).rejects.toMatchObject({ status: 404 });
    expect((await meetupView(d, m.id, A, false, NOW)).meetup.id).toBe(m.id);
    expect((await meetupView(d, m.id, STAFF, true, NOW)).meetup.id).toBe(m.id);
  });

  it('a shadow-ban hides the member\'s meetups too', async () => {
    const { d, p } = db();
    await createMeetup(d, p.a, body(), NOW);
    await actOnMember(d, STAFF, A, { action: 'shadow_ban' }, NOW);
    expect(await listMeetups(d, B, {}, NOW)).toEqual([]);
  });
});

describe('Where the member really is', () => {
  const places = Object.keys(PLACE_COORDS).map((slug) => ({ slug }));

  it('finds the nearest listed destination from a position, entirely on the device', () => {
    expect(nearestPlace(32.2396, 77.1887, places)?.place.slug).toBe('manali');
    expect(nearestPlace(32.2612, 77.1805, places)?.place.slug).toBe('old-manali');
    expect(nearestPlace(19.0760, 72.8777, places)?.place.slug).toBe('mumbai');
  });

  it('says nothing when no destination is close, instead of guessing', () => {
    expect(nearestPlace(0, -30, places)).toBeNull();
    expect(nearestPlace(28.6139, 77.209, places)).toBeNull();
  });

  it('every listed destination has a position', () => {
    expect(Object.keys(PLACE_COORDS)).toHaveLength(27);
  });
});

describe('My activity: hosting, going and history', () => {
  async function seeded() {
    const { d, p } = db({
      club_events: [
        plan('h1', { creator_id: A, title: 'My trek in review', status: 'submitted' }),
        plan('h2', { creator_id: A, title: 'My draft', status: 'draft' }),
        plan('h3', { creator_id: A, title: 'Last month trip', status: 'completed', starts_at: hours(-300), ends_at: hours(-200) }),
        plan('j1', { creator_id: B, title: 'Spiti trip I joined' }),
      ],
      club_event_participants: [{ event_id: 'j1', user_id: A, status: 'reserved', total_due: 0, paid: 0 }],
    });
    await createMeetup(d, p.a, body({ title: 'My live coffee' }), NOW);
    await createMeetup(d, p.a, body({ title: 'My old walk', kind: 'walk' }), new Date(NOW.getTime() - 5 * 3_600_000));
    const theirs = await createMeetup(d, p.b, body({ title: 'Bilal dev meet', kind: 'dev' }), NOW);
    const gone = await createMeetup(d, p.b, body({ title: 'Bilal cancelled party', kind: 'party' }), NOW);
    await joinMeetup(d, theirs.id, p.a, NOW);
    await joinMeetup(d, gone.id, p.a, NOW);
    await cancelMeetup(d, gone.id, B, false, NOW);
    return { d };
  }

  it('hosting lists everything you run, in any state, including meetups and plans still in review', async () => {
    const { d } = await seeded();
    const { hosting } = await myActivity(d, A, NOW);
    expect(hosting.map((i) => [i.title, i.status])).toEqual(expect.arrayContaining([
      ['My trek in review', 'submitted'], ['My draft', 'draft'], ['My live coffee', 'open'],
    ]));
    expect(hosting.every((i) => i.me.hosting)).toBe(true);
    expect(hosting.map((i) => i.title)).not.toContain('Bilal dev meet');
  });

  it('going lists plans and meetups you joined but do not host', async () => {
    const { d } = await seeded();
    const { going } = await myActivity(d, A, NOW);
    expect(going.map((i) => i.title).sort()).toEqual(['Bilal dev meet', 'Spiti trip I joined']);
  });

  it('history holds finished and cancelled ones, newest first, and nothing still running', async () => {
    const { d } = await seeded();
    const { history, hosting, going } = await myActivity(d, A, NOW);
    expect(history.map((i) => [i.title, i.status])).toEqual([
      ['Bilal cancelled party', 'cancelled'], ['My old walk', 'ended'], ['Last month trip', 'completed'],
    ]);
    expect([...hosting, ...going].some((i) => ['My old walk', 'Last month trip', 'Bilal cancelled party'].includes(i.title))).toBe(false);
  });

  it('shows nothing of plans and meetups you have no part in', async () => {
    const { d } = await seeded();
    const all = await myActivity(d, C, NOW);
    expect([...all.hosting, ...all.going, ...all.history]).toEqual([]);
  });
});