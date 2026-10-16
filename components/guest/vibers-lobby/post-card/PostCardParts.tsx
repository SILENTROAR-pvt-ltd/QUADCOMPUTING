'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';
import type { LobbyPostView } from '@/lib/services/lobby/lobby-post-view';
import { KIND_META } from '../lobby-kind-meta';
import { timeAgo } from '../lobby-format';
import { LobbyAvatar } from '../LobbyAvatar';

/** "Remove" for the author's own post, which asks once before it does anything. */
export function RemoveFooter({ confirming, removing, onAsk, onKeep, onRemove }: { confirming: boolean; removing: boolean; onAsk: () => void; onKeep: () => void; onRemove: () => void }) {
  return (
    <footer className="mt-1.5 flex items-center justify-end gap-2">
      {confirming ? (
        <>
          <button type="button" onClick={onKeep} className="min-h-10 cursor-pointer rounded-xl px-3 text-xs font-medium text-neutral-600 hover:bg-neutral-50">Keep</button>
          <button type="button" onClick={onRemove} disabled={removing} className="min-h-10 cursor-pointer rounded-xl bg-rose-600 px-3 text-xs font-semibold text-white disabled:opacity-50">
            {removing ? 'Removing…' : 'Remove post'}
          </button>
        </>
      ) : (
        <button type="button" onClick={onAsk} className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900">
          <Trash2 className="h-3.5 w-3.5" /> Remove
        </button>
      )}
    </footer>
  );
}

/** A message or a want: the author, what kind of post it is, the words, and the photo if there is one. */
export function PlainPostBody({ post }: { post: LobbyPostView }) {
  const meta = KIND_META[post.kind];
  const name = post.author?.name ?? 'Guest';
  return (
    <>
      <header className="flex items-center gap-3">
        <LobbyAvatar name={name} emoji={post.author?.avatar ?? '☕'} url={post.author?.avatar_url ?? null} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-neutral-950">{name}</p>
          <p className="truncate text-[11px] text-neutral-500">{post.author?.handle ?? 'guest'}{post.table ? ` · Table ${post.table}` : ''} · {timeAgo(post.created_at)}</p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${meta.badge}`}><meta.Icon className="h-3 w-3" /> {meta.label}</span>
      </header>
      {post.content && <p className="mt-3 whitespace-pre-line text-[14.5px] leading-relaxed text-neutral-800">{post.content}</p>}
      {post.media_url && (
        <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200">
          {/* eslint-disable-next-line @next/next/no-img-element -- a signed storage URL for the guest's own photo */}
          <img src={post.media_url} alt={post.content || `${name}'s photo`} className="max-h-[28rem] w-full object-cover" loading="lazy" />
        </div>
      )}
    </>
  );
}
