import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({}) }));

import { clubDb, member, seedMembers } from './fakes';
import { parsePost } from '@/lib/club/room/post-input';
import { createPost, deletePost, getPost, listPosts, toggleLike } from '@/lib/club/room/posts.service';
import { addComment, deleteComment, listComments } from '@/lib/club/room/comments.service';
import { memberProfile } from '@/lib/club/membership/member-profile.service';
import { eventCards, joinedEventIds } from '@/lib/club/events/event-cards.service';
import { actOnMember, hideContent } from '@/lib/club/moderation/actions.service';
import { fileReport } from '@/lib/club/moderation/reports.service';

const A = '55555555-aaaa-4bbb-8ccc-00000000000a';
const B = '55555555-aaaa-4bbb-8ccc-00000000000b';
const C = '55555555-aaaa-4bbb-8ccc-00000000000c';
const STAFF = '55555555-aaaa-4bbb-8ccc-0000000000ff';
const PLAN = '55555555-aaaa-4bbb-8ccc-0000000000e1';
const DRAFT = '55555555-aaaa-4bbb-8ccc-0000000000e2';
const PLACE_GOA = '66666666-aaaa-4bbb-8ccc-00000000000a';
const PLACE_MANALI = '66666666-aaaa-4bbb-8ccc-00000000000b';

const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();
const plan = (id: string, status: string) => ({
  id, creator_id: A, title: 'Hampi bouldering weekend', kind: 'tour', cover_paths: [], starts_at: inDays(5), ends_at: inDays(7), venue: 'Hampi',
  status, verified: false, ticket_price: 0, capacity: 12,
});

function db(cOver: Record<string, unknown> = {}) {
  const a = member(A, '@asha'), b = member(B, '@bilal'), c = member(C, '@chet', cOver);
  const d = clubDb({
    ...seedMembers(a, b, c), club_posts: [], club_post_likes: [], club_post_comments: [], club_notifications: [], club_presence: [],
    club_events: [plan(PLAN, 'approved'), plan(DRAFT, 'draft')], club_event_participants: [], club_event_interest: [], club_reports: [],
    club_moderation_log: [], club_stories: [],
  });
  return { d, a: a.profile as any, b: b.profile as any, c: c.profile as any };
}

describe('Common Room posts', () => {
  it('checks what a post may contain, and stars out profanity', () => {
    expect(parsePost({ body: '   ' })).toEqual({ ok: false, error: 'Write something first.' });
    expect(parsePost({ body: 'x'.repeat(1001) }).ok).toBe(false);
    expect(parsePost({ body: 'hi', place_id: 'Goa' }).ok).toBe(false);
    expect(parsePost({ body: 'hi', event_id: 'not-a-plan' }).ok).toBe(false);
    expect(parsePost({ body: 'what the fuck is up in Goa', place_id: PLACE_GOA }))
      .toEqual({ ok: true, row: { body: 'what the f*** is up in Goa', place_id: PLACE_GOA, event_id: null } });
  });

  it('shows the feed newest first, with region, search and author filters', async () => {
    const { d, a, b } = db();
    d.tables.club_posts.push(
      { id: 'p-old', author_id: A, body: 'Chiang Mai this Friday?', place: 'Chiang Mai', region: 'asia', event_id: null, hidden: false, deleted_at: null, created_at: '2026-10-01T10:00:00Z' },
      { id: 'p-new', author_id: B, body: 'Morocco surf towns in May', place: 'Morocco', region: 'africa', event_id: null, hidden: false, deleted_at: null, created_at: '2026-10-02T10:00:00Z' },
    );
    expect((await listPosts(d, A)).posts.map((p) => p.id)).toEqual(['p-new', 'p-old']);
    expect((await listPosts(d, A, { region: 'asia' })).posts.map((p) => p.id)).toEqual(['p-old']);
    expect((await listPosts(d, A, { q: 'morocco' })).posts.map((p) => p.id)).toEqual(['p-new']);
    expect((await listPosts(d, A, { author: A })).posts.map((p) => p.id)).toEqual(['p-old']);
    const created = await createPost(d, a, { body: 'Who is in Hampi?', event_id: PLAN });
    expect(created).toMatchObject({ mine: true, likes: 0, comments: 0, plan: { id: PLAN, title: 'Hampi bouldering weekend' }, author: { name: 'Asha' } });
    await expect(createPost(d, b, { body: 'join my draft', event_id: DRAFT })).rejects.toMatchObject({ status: 400 });
  });

  it('keeps a shadow-banned author\'s posts to themself (and staff)', async () => {
    const { d, c } = db({ shadow_banned: true });
    const post = await createPost(d, c, { body: 'buy followers here' });
    expect((await listPosts(d, A)).posts).toEqual([]);
    expect((await listPosts(d, C)).posts.map((p) => p.id)).toEqual([post.id]);
    expect((await listPosts(d, A, { staff: true })).posts).toHaveLength(1);
    await expect(toggleLike(d, post.id, A, true)).rejects.toMatchObject({ status: 404 });
  });

  it('likes are one per member, and the top sort favours the most liked', async () => {
    const { d, a, b } = db();
    const first = await createPost(d, a, { body: 'first' });
    const second = await createPost(d, b, { body: 'second' });
    expect(await toggleLike(d, first.id, B, true)).toEqual({ likes: 1, liked: true });
    expect(await toggleLike(d, first.id, B, true)).toEqual({ likes: 1, liked: true });
    expect(await toggleLike(d, first.id, C, true)).toEqual({ likes: 2, liked: true });
    expect((await listPosts(d, B, { sort: 'top' })).posts.map((p) => [p.id, p.likes, p.liked])).toEqual([[first.id, 2, true], [second.id, 0, false]]);
    expect(await toggleLike(d, first.id, B, false)).toEqual({ likes: 1, liked: false });
  });

  it('only the author or staff can delete a post', async () => {
    const { d, a } = db();
    const post = await createPost(d, a, { body: 'delete me' });
    await expect(deletePost(d, post.id, B)).rejects.toMatchObject({ status: 404 });
    await deletePost(d, post.id, A);
    await expect(getPost(d, post.id, A)).rejects.toMatchObject({ status: 404 });
    const other = await createPost(d, a, { body: 'staff will remove this' });
    await deletePost(d, other.id, STAFF, true);
    expect((await listPosts(d, A)).posts).toEqual([]);
  });
});

describe('Common Room comments', () => {
  it('notifies the post author, counts visible comments, and hides a shadow-banned commenter', async () => {
    const { d, a, b, c } = db({ shadow_banned: true });
    const post = await createPost(d, a, { body: 'Goa next week?' });
    await addComment(d, post.id, b, { body: 'I am in!' });
    await addComment(d, post.id, a, { body: 'Great' });
    await addComment(d, post.id, c, { body: 'spam link' });
    expect(d.tables.club_notifications).toEqual([expect.objectContaining({ user_id: A, kind: 'post_comment', title: 'Bilal commented on your post', link: `/club?post=${post.id}` })]);
    expect((await listComments(d, post.id, A)).map((x) => x.body)).toEqual(['I am in!', 'Great']);
    expect((await listComments(d, post.id, C)).map((x) => x.body)).toEqual(['I am in!', 'Great', 'spam link']);
    expect((await getPost(d, post.id, A)).comments).toBe(2);
    await expect(addComment(d, post.id, b, { body: '  ' })).rejects.toMatchObject({ status: 400 });
  });

  it('only the commenter or staff can delete a comment', async () => {
    const { d, a, b } = db();
    const post = await createPost(d, a, { body: 'question' });
    const comment: any = await addComment(d, post.id, b, { body: 'answer' });
    await expect(deleteComment(d, comment.id, A)).rejects.toMatchObject({ status: 404 });
    await deleteComment(d, comment.id, B);
    expect(await listComments(d, post.id, A)).toEqual([]);
  });
});

describe('Red Flag Protocol on the Common Room', () => {
  it('posts and comments can be reported and hidden; a shadow-ban hides existing posts', async () => {
    const { d, a, b } = db();
    const post = await createPost(d, a, { body: 'sketchy offer' });
    expect(await fileReport(d, B, { target_type: 'post', target_id: post.id, reason: 'looks like a scam' })).toEqual({ duplicate: false });
    await hideContent(d, STAFF, 'post', post.id);
    expect((await listPosts(d, B)).posts).toEqual([]);
    expect((await listPosts(d, A)).posts).toHaveLength(1);

    const other = await createPost(d, b, { body: 'normal post' });
    await actOnMember(d, STAFF, B, { action: 'shadow_ban' });
    expect((await listPosts(d, A)).posts.map((p) => p.id)).not.toContain(other.id);
    await expect(hideContent(d, STAFF, 'event', post.id)).rejects.toMatchObject({ status: 400 });
  });
});

describe('Member profiles and plan cards', () => {
  it('counts posts, plans hosted and joined; a shadow-banned profile is private', async () => {
    const { d, a } = db({ shadow_banned: true });
    await createPost(d, a, { body: 'hello' });
    d.tables.club_event_participants.push({ event_id: PLAN, user_id: B, status: 'confirmed' });
    d.tables.club_presence.push({ user_id: A, last_seen: new Date().toISOString() });
    const profile = await memberProfile(d, A, B);
    expect(profile).toMatchObject({ self: false, online: true, stats: { posts: 1, hosted: 1, joined: 0 }, member: { name: 'Asha' } });
    expect(profile.plans.map((p) => p.id)).toEqual([PLAN]);
    expect((await memberProfile(d, B, B)).stats.joined).toBe(1);
    await expect(memberProfile(d, C, A)).rejects.toMatchObject({ status: 404 });
    expect((await memberProfile(d, C, C)).self).toBe(true);
  });

  it('plan cards say who is going and where the viewer stands', async () => {
    const { d } = db();
    d.tables.club_event_participants.push({ event_id: PLAN, user_id: B, status: 'confirmed' }, { event_id: PLAN, user_id: C, status: 'cancelled' });
    d.tables.club_event_interest.push({ event_id: PLAN, user_id: C });
    const [card] = await eventCards(d, [d.tables.club_events[0]], C);
    expect(card).toMatchObject({ going: 1, interested: 1, people: 2, me: { hosting: false, going: false, interested: true } });
    expect(card.faces.map((f) => f.name)).toEqual(['Bilal', 'Chet']);
    expect(await joinedEventIds(d, C)).toEqual([PLAN]);
    expect(await joinedEventIds(d, A)).toEqual([]);
  });
});
