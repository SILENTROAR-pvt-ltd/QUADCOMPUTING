'use client';

import type { LobbyKind } from './lobby-rules';
import type { LobbyPostView } from '@/lib/services/lobby/lobby-post-view';

export interface LobbyPostsPage {
  posts: LobbyPostView[];
  has_more: boolean;
  next_before: string | null;
}

export type LobbyFilter = 'all' | LobbyKind;
export interface LobbyPostsQuery { kind: LobbyFilter; mine: boolean; q: string; before?: string | null }

type Outcome<T> = { ok: true; value: T } | { ok: false; error: string };

const network = 'Network problem. Check your connection and try again.';

async function readError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return data?.error || fallback;
}

export async function fetchLobbyPosts(venueId: string, query: LobbyPostsQuery): Promise<Outcome<LobbyPostsPage>> {
  const p = new URLSearchParams({ cafe_id: venueId });
  if (query.kind !== 'all') p.set('kind', query.kind);
  if (query.mine) p.set('mine', '1');
  if (query.q.trim()) p.set('q', query.q.trim());
  if (query.before) p.set('before', query.before);
  try {
    const res = await fetch(`/api/guest/lobby/posts?${p.toString()}`, { cache: 'no-store' });
    if (!res.ok) return { ok: false, error: await readError(res, 'The lobby could not be loaded.') };
    const data = await res.json();
    return { ok: true, value: { posts: data.posts, has_more: data.has_more, next_before: data.next_before } };
  } catch {
    return { ok: false, error: network };
  }
}

export async function createLobbyPost(
  venueId: string,
  input: { kind: LobbyKind; content: string; table: string | null; photo?: Blob | null }
): Promise<Outcome<LobbyPostView>> {
  const form = new FormData();
  form.set('kind', input.kind);
  form.set('content', input.content);
  if (input.table) form.set('table', input.table);
  if (input.photo) form.set('photo', input.photo, 'moment.jpg');
  try {
    const res = await fetch(`/api/guest/lobby/posts?cafe_id=${encodeURIComponent(venueId)}`, {
      method: 'POST',
      body: form,
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, error: await readError(res, 'Your post could not be shared. Please try again.') };
    const data = await res.json();
    return { ok: true, value: data.post };
  } catch {
    return { ok: false, error: network };
  }
}

export async function deleteLobbyPost(venueId: string, postId: string): Promise<Outcome<null>> {
  try {
    const res = await fetch(`/api/guest/lobby/posts/${encodeURIComponent(postId)}?cafe_id=${encodeURIComponent(venueId)}`, {
      method: 'DELETE',
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, error: await readError(res, 'The post could not be removed.') };
    return { ok: true, value: null };
  } catch {
    return { ok: false, error: network };
  }
}
