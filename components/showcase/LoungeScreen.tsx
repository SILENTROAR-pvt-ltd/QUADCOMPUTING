'use client';

import React, { useState } from 'react';
import { LoungeHero } from '@/components/guest/vibers-lobby/LoungeHero';
import { LobbyPostCard } from '@/components/guest/vibers-lobby/LobbyPostCard';
import type { LobbyPostView } from '@/lib/services/lobby/lobby-post-view';
import { DEMO_VENUE } from '@/lib/showcase/demo-orders';

const ago = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();
const author = (name: string, handle: string) => ({ name, handle, avatar: '☕', avatar_url: null });

// Memories left on the lounge wall by fictional guests, with the landing page's own photography.
const POSTS: LobbyPostView[] = [
  { id: 'pc-pool-01', kind: 'moment', content: 'Woke up to this. Coffee by the pool, nowhere to be.', table: '204', created_at: ago(2),
    media_url: '/media/vibers/photo-stay-pool-v1.webp', mine: false, author: author('Aanya', 'aanya'), likes: 18, liked: false, replies: 4 },
  { id: 'pc-fire-02', kind: 'moment', content: 'Strangers at eight, storytellers by midnight.', table: 'T-07', created_at: ago(5),
    media_url: '/media/vibers/photo-bonfire-v1.webp', mine: false, author: author('Kabir', 'kabir'), likes: 32, liked: false, replies: 9 },
  { id: 'pc-yard-03', kind: 'moment', content: 'The courtyard after dark. Best dinner of the whole trip.', table: 'T-02', created_at: ago(9),
    media_url: '/media/vibers/photo-courtyard-v1.webp', mine: false, author: author('Meera', 'meera'), likes: 24, liked: false, replies: 6 },
];

/**
 * The Vibers Lounge wall: the real hero and postcards (the photo, the postmark, the handwritten line, Like and Comment)
 * with three memories. Liking works locally, so the recording can double-tap a photo and see the heart and the count.
 */
export function LoungeScreen() {
  const [posts, setPosts] = useState(POSTS);
  const like = async (id: string) => {
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p)));
    return { ok: true };
  };
  return (
    <div className="min-h-screen space-y-6 bg-[#f6f3ec] px-4 pb-10 pt-4">
      <LoungeHero venueName={DEMO_VENUE.name} />
      {posts.map((post) => (
        <LobbyPostCard key={post.id} venueId={DEMO_VENUE.id} venueName={DEMO_VENUE.name} post={post} canEngage
          onRemove={async () => ({ ok: true })} onLike={like} onRequestJoin={() => undefined} onRepliesChanged={() => undefined} />
      ))}
    </div>
  );
}
