'use client';

import React, { useState } from 'react';
import type { LobbyPostView } from '@/lib/services/lobby/lobby-post-view';
import { timeAgo } from './lobby-format';
import { LobbyPostActions } from './LobbyPostActions';
import { LobbyReplies } from './LobbyReplies';
import { MemoryPostcard } from './MemoryPostcard';
import { postcardTilt } from './postcard-look';
import { PlainPostBody, RemoveFooter } from './post-card/PostCardParts';

type Result = { ok: boolean; error?: string };

interface LobbyPostCardProps {
  venueId: string;
  venueName: string;
  post: LobbyPostView;
  canEngage: boolean;
  onRemove: (id: string) => Promise<Result>;
  onLike: (id: string) => Promise<Result>;
  onRequestJoin: () => void;
  onRepliesChanged: (id: string, delta: number) => void;
}

/**
 * One lobby post. A moment with a photo is a postcard on the wall; a message or a want is a clean card. Either way: Like and
 * Reply, the reply thread when open, and Remove for the author's own.
 */
export function LobbyPostCard({ venueId, venueName, post, canEngage, onRemove, onLike, onRequestJoin, onRepliesChanged }: LobbyPostCardProps) {
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = post.author?.name ?? 'Guest';

  const like = async () => {
    if (!canEngage) return onRequestJoin();
    setError(null);
    const out = await onLike(post.id);
    if (!out.ok) setError(out.error ?? 'That did not go through.');
  };

  const remove = async () => {
    setRemoving(true);
    setError(null);
    const out = await onRemove(post.id);
    setRemoving(false);
    if (!out.ok) setError(out.error ?? 'Could not remove this post.');
  };

  const engagement = (
    <>
      <LobbyPostActions post={post} repliesOpen={repliesOpen} onLike={like} onToggleReplies={() => setRepliesOpen((open) => !open)} />
      {repliesOpen && <LobbyReplies venueId={venueId} postId={post.id} canReply={canEngage} onRequestJoin={onRequestJoin} onReplied={(d = 1) => onRepliesChanged(post.id, d)} />}
      {error && <p role="alert" className="mt-2 text-[11px] text-rose-600">{error}</p>}
      {post.mine && <RemoveFooter confirming={confirming} removing={removing} onAsk={() => setConfirming(true)} onKeep={() => setConfirming(false)} onRemove={remove} />}
    </>
  );

  // A moment with its photo: the postcard.
  if (post.kind === 'moment' && post.media_url) {
    return (
      <article className="px-1 [content-visibility:auto] [contain-intrinsic-size:auto_520px]">
        <MemoryPostcard
          id={post.id} venue={venueName} dateIso={post.created_at} tilt={postcardTilt(post.id)}
          onDoubleTap={() => { if (!post.liked) void like(); }}
          signature={`${name}${post.table ? ` · Table ${post.table}` : ''} · ${timeAgo(post.created_at)}`}
          photo={
            // eslint-disable-next-line @next/next/no-img-element -- a signed storage URL for the guest's own photo
            <img src={post.media_url} alt={post.content || `${name}'s postcard`} loading="lazy" decoding="async" className="h-full w-full object-cover" />
          }
          caption={post.content || <span className="text-[#b3a78c]">A moment at {venueName || 'the venue'}.</span>}
        >
          <div className="mt-1">{engagement}</div>
        </MemoryPostcard>
      </article>
    );
  }

  return (
    <article className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] [content-visibility:auto] [contain-intrinsic-size:auto_180px]">
      <PlainPostBody post={post} />
      {engagement}
    </article>
  );
}

export default LobbyPostCard;
