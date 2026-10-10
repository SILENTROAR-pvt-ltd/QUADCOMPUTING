'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createLobbyPost, deleteLobbyPost, fetchLobbyPosts, type LobbyFilter } from '@/lib/guest/lobby-posts-client';
import type { LobbyKind } from '@/lib/guest/lobby-rules';
import type { LobbyPostView } from '@/lib/services/lobby/lobby-post-view';

type Mode = 'replace' | 'append' | 'merge';
const POLL_MS = 20_000;

/** Keeps the lobby feed for one venue: filters, paging, a quiet refresh, and posting and removing. */
export function useVibersLobby(venueId: string) {
  const [kind, setKind] = useState<LobbyFilter>('all');
  const [mine, setMine] = useState(false);
  const [q, setQ] = useState('');
  const [posts, setPosts] = useState<LobbyPostView[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqRef = useRef(0);

  const load = useCallback(async (before: string | null, mode: Mode) => {
    const id = ++reqRef.current;
    if (mode === 'append') setLoadingMore(true);
    else if (mode === 'replace') setLoading(true);
    setError(null);
    const out = await fetchLobbyPosts(venueId, { kind, mine, q, before });
    if (id !== reqRef.current) return;
    if (!out.ok) {
      setError(out.error);
    } else {
      const page = out.value;
      setPosts((prev) => {
        if (mode === 'append') return [...prev, ...page.posts];
        if (mode === 'replace') return page.posts;
        const fresh = new Set(page.posts.map((p) => p.id));
        return [...page.posts, ...prev.filter((p) => !fresh.has(p.id))];
      });
      if (mode !== 'merge') {
        setHasMore(page.has_more);
        setNextBefore(page.next_before);
      }
    }
    setLoading(false);
    setLoadingMore(false);
  }, [venueId, kind, mine, q]);

  useEffect(() => { void load(null, 'replace'); }, [load]);

  // Other guests' posts appear without a reload. A refresh keeps the pages already loaded.
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load(null, 'merge');
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const loadMore = useCallback(() => {
    if (hasMore && nextBefore && !loadingMore) void load(nextBefore, 'append');
  }, [hasMore, nextBefore, loadingMore, load]);

  const post = useCallback(async (input: { kind: LobbyKind; content: string; table: string | null; photo?: Blob | null }) => {
    const out = await createLobbyPost(venueId, input);
    if (out.ok) setPosts((prev) => [out.value, ...prev.filter((p) => p.id !== out.value.id)]);
    return out;
  }, [venueId]);

  const remove = useCallback(async (postId: string) => {
    const out = await deleteLobbyPost(venueId, postId);
    if (out.ok) setPosts((prev) => prev.filter((p) => p.id !== postId));
    return out;
  }, [venueId]);

  return {
    kind, setKind, mine, setMine, q, setQ, setPosts,
    posts, hasMore, loading, loadingMore, error,
    loadMore, retry: () => void load(null, 'replace'), post, remove,
  };
}
