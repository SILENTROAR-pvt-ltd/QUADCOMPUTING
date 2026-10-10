import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { createLobbyPost } from '@/lib/services/lobby/lobby-post-write';
import { listLobbyPosts } from '@/lib/services/lobby/lobby-post-query';
import { toggleLobbyLike } from '@/lib/services/lobby/lobby-engagement';

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
  });
}

async function postByAsha(db: any, venue = VENUE_A): Promise<string> {
  const out = await createLobbyPost(db, noStore as any, ASHA as any, venue, {
    kind: 'message', content: 'hello', table: 'T-01', media: null,
  });
  if (!out.ok) throw new Error(out.error);
  return out.value.id;
}

const feed = (db: any, viewerId: string | null, venue = VENUE_A) =>
  listLobbyPosts(db, venue, { kind: 'all', mine: false, search: null, before: null, limit: 20, viewerId });

describe('Vibers Lobby likes', () => {
  it('counts one like per guest and takes the like back on a second tap', async () => {
    const db = seed();
    const postId = await postByAsha(db);
    expect(await toggleLobbyLike(db, RAVI.id, VENUE_A, postId)).toEqual({ ok: true, value: { liked: true, likes: 1 } });
    expect(await toggleLobbyLike(db, ASHA.id, VENUE_A, postId)).toEqual({ ok: true, value: { liked: true, likes: 2 } });
    expect(await toggleLobbyLike(db, RAVI.id, VENUE_A, postId)).toEqual({ ok: true, value: { liked: false, likes: 1 } });
  });

  it('shows each viewer their own like state on the feed', async () => {
    const db = seed();
    const postId = await postByAsha(db);
    await toggleLobbyLike(db, RAVI.id, VENUE_A, postId);

    const forRavi = await feed(db, RAVI.id);
    expect(forRavi.posts[0]).toMatchObject({ id: postId, likes: 1, liked: true, replies: 0 });
    const forAsha = await feed(db, ASHA.id);
    expect(forAsha.posts[0]).toMatchObject({ likes: 1, liked: false });
    const anonymous = await feed(db, null);
    expect(anonymous.posts[0]).toMatchObject({ likes: 1, liked: false });
  });

  it('refuses a like on another venue\'s post or on a post that does not exist', async () => {
    const db = seed();
    const postId = await postByAsha(db, VENUE_B);
    expect(await toggleLobbyLike(db, RAVI.id, VENUE_A, postId)).toMatchObject({ ok: false, status: 404 });
    expect(await toggleLobbyLike(db, RAVI.id, VENUE_A, 'dddddddd-1111-4222-8333-444444444444')).toMatchObject({ ok: false, status: 404 });
  });
});
