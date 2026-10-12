'use client';

import { useCallback, useEffect, useState } from 'react';
import { clubFetch } from '../api';
import type { Post } from './types';

export type FeedSort = 'new' | 'top' | 'following';
export interface FeedFilters { q: string; sort: FeedSort; region?: string; place?: string; author?: string }

/** The Common Room feed for the given filters: first page, older pages on demand, local edits. */
export function usePosts({ q, sort, region, place, author }: FeedFilters) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [error, setError] = useState<{ text: string; code?: string } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const query = useCallback((before?: string | null) => {
    const p = new URLSearchParams();
    if (region) p.set('region', region);
    if (place) p.set('place', place);
    if (q.trim()) p.set('q', q.trim());
    if (sort !== 'new') p.set('sort', sort);
    if (author) p.set('author', author);
    if (before) p.set('before', before);
    return `/posts?${p}`;
  }, [region, place, q, sort, author]);

  const load = useCallback(async () => {
    const res = await clubFetch(query());
    if (!res.ok) { setError({ text: res.error, code: res.code }); setPosts([]); return; }
    setError(null);
    setPosts(res.data.posts);
    setNext(res.data.nextBefore);
  }, [query]);

  useEffect(() => {
    setPosts(null);
    const t = setTimeout(() => { void load(); }, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const loadMore = async () => {
    if (!next || loadingMore) return;
    setLoadingMore(true);
    const res = await clubFetch(query(next));
    setLoadingMore(false);
    if (!res.ok) return;
    setPosts((list) => [...(list || []), ...res.data.posts.filter((n: Post) => !(list || []).some((x) => x.id === n.id))]);
    setNext(res.data.nextBefore);
  };

  const patch = useCallback((id: string, change: Partial<Post>) => setPosts((list) => list?.map((p) => (p.id === id ? { ...p, ...change } : p)) ?? list), []);
  const remove = useCallback((id: string) => setPosts((list) => list?.filter((p) => p.id !== id) ?? list), []);
  const prepend = useCallback((post: Post) => setPosts((list) => [post, ...(list || []).filter((p) => p.id !== post.id)]), []);

  return { posts, error, hasMore: Boolean(next), loadingMore, loadMore, reload: load, patch, remove, prepend };
}
