'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { likeLobbyPost } from '@/lib/guest/lobby-engagement-client';
import type { LobbyPostView } from '@/lib/services/lobby/lobby-post-view';

type Setter = Dispatch<SetStateAction<LobbyPostView[]>>;

function patchPost(setPosts: Setter, postId: string, change: (p: LobbyPostView) => Partial<LobbyPostView>) {
  setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...change(p) } : p)));
}

/** Likes and reply counts on the feed. A like shows at once and is put back if the server refuses it. */
export function useLobbyEngagement(venueId: string, posts: LobbyPostView[], setPosts: Setter) {
  const like = useCallback(async (postId: string): Promise<{ ok: boolean; error?: string }> => {
    const target = posts.find((p) => p.id === postId);
    if (!target) return { ok: false, error: 'Post not found.' };

    const nextLiked = !target.liked;
    patchPost(setPosts, postId, () => ({ liked: nextLiked, likes: Math.max(0, target.likes + (nextLiked ? 1 : -1)) }));
    const out = await likeLobbyPost(venueId, postId);
    patchPost(setPosts, postId, () => (out.ok ? out.value : { liked: target.liked, likes: target.likes }));
    return out;
  }, [venueId, posts, setPosts]);

  const repliesChanged = useCallback((postId: string, delta: number) => {
    patchPost(setPosts, postId, (p) => ({ replies: Math.max(0, p.replies + delta) }));
  }, [setPosts]);

  return { like, repliesChanged };
}
