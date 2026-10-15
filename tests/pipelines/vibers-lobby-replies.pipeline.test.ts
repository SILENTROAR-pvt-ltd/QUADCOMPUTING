import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { createLobbyPost } from '@/lib/services/lobby/lobby-post-write';
import { listLobbyPosts } from '@/lib/services/lobby/lobby-post-query';
import { addReply, listReplies } from '@/lib/services/lobby/lobby-replies';

const VENUE_A = 'aaaaaaaa-1111-4222-8333-444444444444';
const VENUE_B = 'bbbbbbbb-1111-4222-8333-444444444444';
const ASHA = { id: 'acc-asha', handle: '@asha', display_name: 'Asha', avatar: '☕', photo_path: null };
const RAVI = { id: 'acc-ravi', handle: '@ravi', display_name: 'Ravi', avatar: '🎒', photo_path: null };
const noStore = { put: async () => {}, remove: async () => {} };

function seed() {
  return createFakeSupabase({
    businesses: [{ id: VENUE_A }, { id: VENUE_B }],
    guest_accounts: [{ ...ASHA }, { ...RAVI }],
    lobby_posts: [],
    lobby_post_replies: [],
  });
}

async function postByAsha(db: any, venue = VENUE_A): Promise<string> {
  const out = await createLobbyPost(db, noStore as any, ASHA as any, venue, {
    kind: 'message', content: 'a charger', table: 'T-01', media: null,
  });
  if (!out.ok) throw new Error(out.error);
  return out.value.id;
}

describe('Vibers Lobby replies', () => {
  it('shows a reply with the replier\'s current name, and marks the viewer\'s own', async () => {
    const db = seed();
    const postId = await postByAsha(db);
    const added = await addReply(db, RAVI as any, VENUE_A, postId, 'I have one');
    expect(added).toMatchObject({ ok: true, value: { content: 'I have one', mine: true, author: { name: 'Ravi' } } });

    const forAsha = await listReplies(db, VENUE_A, ASHA.id, postId);
    expect(forAsha).toMatchObject({ ok: true, value: [{ content: 'I have one', mine: false, author: { name: 'Ravi' } }] });
    const forRavi = await listReplies(db, VENUE_A, RAVI.id, postId);
    expect(forRavi).toMatchObject({ ok: true, value: [{ mine: true }] });
  });

  it('counts replies on the feed', async () => {
    const db = seed();
    const postId = await postByAsha(db);
    await addReply(db, RAVI as any, VENUE_A, postId, 'on it');
    const page = await listLobbyPosts(db, VENUE_A, { kind: 'all', mine: false, search: null, before: null, limit: 20, viewerId: null });
    expect(page.posts[0]).toMatchObject({ id: postId, replies: 1 });
  });

  it('refuses an empty or over-long reply', async () => {
    const db = seed();
    const postId = await postByAsha(db);
    expect(await addReply(db, RAVI as any, VENUE_A, postId, '   ')).toMatchObject({ ok: false, status: 400 });
    expect(await addReply(db, RAVI as any, VENUE_A, postId, 'x'.repeat(301))).toMatchObject({ ok: false, status: 400 });
  });

  it('keeps reply text plain and refuses another venue\'s post', async () => {
    const db = seed();
    const postId = await postByAsha(db);
    const plain = await addReply(db, RAVI as any, VENUE_A, postId, '<b>hi</b>');
    expect(plain.ok && plain.value.content).not.toContain('<');

    const otherPost = await postByAsha(db, VENUE_B);
    expect(await addReply(db, RAVI as any, VENUE_A, otherPost, 'hi')).toMatchObject({ ok: false, status: 404 });
    expect(await listReplies(db, VENUE_A, null, otherPost)).toMatchObject({ ok: false, status: 404 });
  });
});
