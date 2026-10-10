'use client';

import type { LobbyReplyView } from '@/lib/services/lobby/lobby-reply-view';

type Outcome<T> = { ok: true; value: T } | { ok: false; error: string };

const network = 'Network problem. Check your connection and try again.';

async function readError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return data?.error || fallback;
}

export async function likeLobbyPost(venueId: string, postId: string): Promise<Outcome<{ liked: boolean; likes: number }>> {
  try {
    const res = await fetch(`/api/guest/lobby/posts/${encodeURIComponent(postId)}/like?cafe_id=${encodeURIComponent(venueId)}`, {
      method: 'POST',
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, error: await readError(res, 'That did not go through. Please try again.') };
    const data = await res.json();
    return { ok: true, value: { liked: data.liked, likes: data.likes } };
  } catch {
    return { ok: false, error: network };
  }
}

export async function fetchLobbyReplies(venueId: string, postId: string): Promise<Outcome<LobbyReplyView[]>> {
  try {
    const res = await fetch(`/api/guest/lobby/posts/${encodeURIComponent(postId)}/replies?cafe_id=${encodeURIComponent(venueId)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, error: await readError(res, 'Replies could not be loaded.') };
    const data = await res.json();
    return { ok: true, value: data.replies };
  } catch {
    return { ok: false, error: network };
  }
}

export async function addLobbyReply(venueId: string, postId: string, content: string): Promise<Outcome<LobbyReplyView>> {
  try {
    const res = await fetch(`/api/guest/lobby/posts/${encodeURIComponent(postId)}/replies?cafe_id=${encodeURIComponent(venueId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, error: await readError(res, 'Your reply could not be sent. Please try again.') };
    const data = await res.json();
    return { ok: true, value: data.reply };
  } catch {
    return { ok: false, error: network };
  }
}
