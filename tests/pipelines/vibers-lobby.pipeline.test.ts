import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { cleanLobbyContent, lobbyPostError, lobbyPageLimit } from '@/lib/guest/lobby-rules';
import { createLobbyPost, deleteLobbyPost } from '@/lib/services/lobby/lobby-post-write';
import { listLobbyPosts, safeSearch } from '@/lib/services/lobby/lobby-post-query';
import type { PhotoStore } from '@/lib/services/guest-auth/guest-avatar.service';

const VENUE_A = 'aaaaaaaa-1111-4222-8333-444444444444';
const VENUE_B = 'bbbbbbbb-1111-4222-8333-444444444444';
const ASHA = { id: 'acc-asha', handle: '@asha', display_name: 'Asha', avatar: '☕', photo_path: null };
const RAVI = { id: 'acc-ravi', handle: '@ravi', display_name: 'Ravi', avatar: '🎒', photo_path: null };
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]);

function store() {
  const files = new Map<string, Uint8Array>();
  const s: PhotoStore & { files: Map<string, Uint8Array> } = {
    files,
    async put(path, bytes) { files.set(path, bytes); },
    async remove(paths) { for (const p of paths) files.delete(p); },
  };
  return s;
}

const iso = (minsAgo: number) => new Date(Date.now() - minsAgo * 60_000).toISOString();

function seed(extra: Record<string, any[]> = {}) {
  return createFakeSupabase({
    businesses: [{ id: VENUE_A, business_name: 'Venue A' }, { id: VENUE_B, business_name: 'Venue B' }],
    guest_accounts: [{ ...ASHA }, { ...RAVI }],
    lobby_posts: [],
    ...extra,
  });
}

const post = (db: any, s: PhotoStore, author: any, venue: string, over: Record<string, unknown> = {}) =>
  createLobbyPost(db, s, author, venue, { kind: 'message', content: 'hello', table: 'T-01', media: null, ...over });

describe('Vibers Lobby: what a guest may post', () => {
  it('cleans text: no markup, no control characters, bounded length', () => {
    expect(cleanLobbyContent('a<b>c')).toBe('a b c');
    expect(cleanLobbyContent('x\u0007y')).toBe('x y');
    expect(cleanLobbyContent('a\n\n\n\nb')).toBe('a\n\nb');
    expect(cleanLobbyContent('x'.repeat(900))).toHaveLength(500);
  });

  it('refuses unknown kinds, a moment without a photo, any new want, and empty posts', () => {
    expect(lobbyPostError({ kind: 'shout', content: 'hi', hasMedia: false })).toMatch(/Choose/);
    expect(lobbyPostError({ kind: 'moment', content: 'nice view', hasMedia: false })).toMatch(/photo/);
    expect(lobbyPostError({ kind: 'want', content: 'a charger please', hasMedia: false })).toMatch(/retired/);
    expect(lobbyPostError({ kind: 'message', content: '', hasMedia: false })).toMatch(/Write something/);
    expect(lobbyPostError({ kind: 'moment', content: '', hasMedia: true })).toBeNull();
  });

  it('keeps page sizes within bounds', () => {
    expect(lobbyPageLimit('500')).toBe(40);
    expect(lobbyPageLimit('0')).toBe(20);
    expect(lobbyPageLimit(undefined)).toBe(20);
  });

  it('saves a message under the signed-in author, with their name and handle', async () => {
    const db = seed();
    const res = await post(db, store(), ASHA, VENUE_A, { content: 'Great <i>chai</i>' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value).toMatchObject({ kind: 'message', content: 'Great i chai /i', table: 'T-01', mine: true });
    expect(res.value.author).toMatchObject({ handle: '@asha', name: 'Asha' });
  });

  it('stores a moment photo under the author, after checking its real type', async () => {
    const db = seed();
    const s = store();
    const res = await post(db, s, ASHA, VENUE_A, { kind: 'moment', content: 'sunset', media: JPEG });
    expect(res.ok).toBe(true);
    const path = db.tables.lobby_posts[0].media_path as string;
    expect(path).toMatch(new RegExp(`^${ASHA.id}/[^/]+\\.jpg$`));
    expect(s.files.has(path)).toBe(true);
  });

  it('refuses a photo that is not a real image, and an oversized one, and keeps nothing', async () => {
    const db = seed();
    const s = store();
    const fake = await post(db, s, ASHA, VENUE_A, { kind: 'moment', media: new TextEncoder().encode('<svg onload=x>') });
    expect(fake).toMatchObject({ ok: false, status: 415 });
    const big = new Uint8Array(1300 * 1024);
    big.set(JPEG, 0);
    const huge = await post(db, s, ASHA, VENUE_A, { kind: 'moment', media: big });
    expect(huge).toMatchObject({ ok: false, status: 413 });
    expect(db.tables.lobby_posts).toHaveLength(0);
    expect(s.files.size).toBe(0);
  });

  it('removes the photo again if the post cannot be saved', async () => {
    const db = createFakeSupabase({ businesses: [{ id: VENUE_A }], lobby_posts: [] }, { failOn: { 'lobby_posts.insert': () => true } });
    const s = store();
    await expect(post(db, s, ASHA, VENUE_A, { kind: 'moment', media: JPEG })).rejects.toBeDefined();
    expect(s.files.size).toBe(0);
  });
});

describe('Vibers Lobby: the feed', () => {
  const rows = [
    { id: 'p1', business_id: VENUE_A, author_account_id: 'acc-asha', kind: 'message', content: 'hello room', table_number: 'T-01', media_path: null, created_at: iso(30) },
    { id: 'p2', business_id: VENUE_A, author_account_id: 'acc-ravi', kind: 'want', content: 'need a charger', table_number: 'T-04', media_path: null, created_at: iso(20) },
    { id: 'p3', business_id: VENUE_A, author_account_id: 'acc-asha', kind: 'moment', content: 'sunset', table_number: 'T-01', media_path: null, created_at: iso(10) },
    { id: 'p4', business_id: VENUE_B, author_account_id: 'acc-ravi', kind: 'message', content: 'hello elsewhere', table_number: 'T-02', media_path: null, created_at: iso(5) },
  ];
  const q = (over: Partial<Parameters<typeof listLobbyPosts>[2]> = {}) =>
    listLobbyPosts(seed({ lobby_posts: rows }), VENUE_A, { kind: 'all', mine: false, search: null, before: null, limit: 20, viewerId: null, ...over });

  it('shows only this venue, newest first', async () => {
    const page = await q();
    // p2 is an old want: the feed no longer shows wants.
    expect(page.posts.map((p) => p.id)).toEqual(['p3', 'p1']);
  });

  it('filters by kind', async () => {
    expect((await q({ kind: 'want' })).posts.map((p) => p.id)).toEqual(['p2']);
    expect((await q({ kind: 'moment' })).posts.map((p) => p.id)).toEqual(['p3']);
  });

  it('"mine" shows only the viewer\'s posts, and nothing without a viewer', async () => {
    expect((await q({ mine: true, viewerId: 'acc-asha' })).posts.map((p) => p.id)).toEqual(['p3', 'p1']);
    expect((await q({ mine: true, viewerId: null })).posts).toEqual([]);
  });

  it('searches the text of posts in this venue only', async () => {
    expect((await q({ search: 'hello' })).posts.map((p) => p.id)).toEqual(['p1']);
  });

  it('pages with a cursor and reports when more exist', async () => {
    const first = await q({ limit: 1 });
    expect(first.posts.map((p) => p.id)).toEqual(['p3']);
    expect(first.has_more).toBe(true);
    const second = await q({ limit: 1, before: first.next_before });
    expect(second.posts.map((p) => p.id)).toEqual(['p1']);
    expect(second.has_more).toBe(false);
  });

  it('shows the author as they are now, so a renamed guest appears with the new name', async () => {
    const db = seed({ lobby_posts: rows });
    db.tables.guest_accounts[0].display_name = 'Asha R';
    const page = await listLobbyPosts(db, VENUE_A, { kind: 'all', mine: false, search: null, before: null, limit: 20, viewerId: null });
    expect(page.posts.find((p) => p.id === 'p1')?.author?.name).toBe('Asha R');
  });

  it('refuses search text that could change the filter', () => {
    expect(safeSearch('a%b')).toBeNull();
    expect(safeSearch('x,y(z)')).toBeNull();
    expect(safeSearch('  chai  ')).toBe('chai');
  });
});

describe('Vibers Lobby: deleting a post', () => {
  it('only the author can delete, and deleting also removes the photo', async () => {
    const db = seed();
    const s = store();
    const created = await post(db, s, ASHA, VENUE_A, { kind: 'moment', media: JPEG });
    if (!created.ok) throw new Error('setup');
    const id = created.value.id;

    expect(await deleteLobbyPost(db, s, RAVI.id, VENUE_A, id)).toMatchObject({ ok: false, status: 404 });
    expect(db.tables.lobby_posts).toHaveLength(1);

    expect(await deleteLobbyPost(db, s, ASHA.id, VENUE_A, id)).toEqual({ ok: true, value: null });
    expect(db.tables.lobby_posts).toHaveLength(0);
    expect(s.files.size).toBe(0);
  });

  it('a post from another venue cannot be deleted through this venue', async () => {
    const db = seed({ lobby_posts: [{ id: 'pb', business_id: VENUE_B, author_account_id: 'acc-asha', kind: 'message', content: 'x', created_at: iso(1) }] });
    expect(await deleteLobbyPost(db, store(), 'acc-asha', VENUE_A, 'pb')).toMatchObject({ ok: false, status: 404 });
    expect(db.tables.lobby_posts).toHaveLength(1);
  });
});
