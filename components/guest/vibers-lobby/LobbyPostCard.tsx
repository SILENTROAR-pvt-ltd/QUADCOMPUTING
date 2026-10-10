'use client';

import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { LobbyPostView } from '@/lib/services/lobby/lobby-post-view';
import { KIND_META } from './lobby-kind-meta';
import { timeAgo } from './lobby-format';
import { LobbyAvatar } from './LobbyAvatar';
import { LobbyPostActions } from './LobbyPostActions';
import { LobbyReplies } from './LobbyReplies';

type Result = { ok: boolean; error?: string };

interface LobbyPostCardProps {
  venueId: string;
  post: LobbyPostView;
  canEngage: boolean;
  onRemove: (id: string) => Promise<Result>;
  onLike: (id: string) => Promise<Result>;
  onRequestJoin: () => void;
  onRepliesChanged: (id: string, delta: number) => void;
}

/** One lobby post: the author, the words and photo, Like and Reply, and the reply thread when open. */
export function LobbyPostCard({ venueId, post, canEngage, onRemove, onLike, onRequestJoin, onRepliesChanged }: LobbyPostCardProps) {
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const meta = KIND_META[post.kind];
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

  return (
    <article className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <header className="flex items-center gap-3">
        <LobbyAvatar name={name} emoji={post.author?.avatar ?? '☕'} url={post.author?.avatar_url ?? null} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-neutral-950">{name}</p>
          <p className="truncate text-[11px] text-neutral-500">
            {post.author?.handle ?? 'guest'}{post.table ? ` · Table ${post.table}` : ''} · {timeAgo(post.created_at)}
          </p>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${meta.badge}`}>
          <meta.Icon className="h-3 w-3" /> {meta.label}
        </span>
      </header>

      {post.content && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-neutral-800">{post.content}</p>}

      {post.media_url && (
        <div className="mt-3 overflow-hidden rounded-2xl border border-neutral-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.media_url} alt={post.content || `${name}'s moment`} className="max-h-[28rem] w-full object-cover" loading="lazy" />
        </div>
      )}

      <LobbyPostActions
        post={post}
        repliesOpen={repliesOpen}
        onLike={like}
        onToggleReplies={() => setRepliesOpen((open) => !open)}
      />

      {repliesOpen && (
        <LobbyReplies
          venueId={venueId}
          postId={post.id}
          canReply={canEngage}
          onRequestJoin={onRequestJoin}
          onReplied={() => onRepliesChanged(post.id, 1)}
        />
      )}

      {error && <p role="alert" className="mt-2 text-[11px] text-rose-600">{error}</p>}

      {post.mine && (
        <footer className="mt-2 flex items-center justify-end gap-2">
          {confirming ? (
            <>
              <button type="button" onClick={() => setConfirming(false)} className="rounded-xl px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 cursor-pointer">
                Keep
              </button>
              <button type="button" onClick={remove} disabled={removing} className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer">
                {removing ? 'Removing…' : 'Remove post'}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 cursor-pointer">
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          )}
        </footer>
      )}
    </article>
  );
}

export default LobbyPostCard;
