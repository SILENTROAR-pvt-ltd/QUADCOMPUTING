'use client';

import React from 'react';
import { SendHorizonal } from 'lucide-react';
import { LOBBY_REPLY_MAX } from '@/lib/guest/lobby-rules';
import { LobbyAvatar } from './LobbyAvatar';
import { timeAgo } from './lobby-format';
import { isPending, useReplyThread } from './replies/useReplyThread';

interface LobbyRepliesProps {
  venueId: string;
  postId: string;
  canReply: boolean;
  onRequestJoin: () => void;
  /** Tells the post a comment was added (+1) or taken back after it failed (-1). */
  onReplied: (delta?: number) => void;
}

/** The comments under a post, one short line each, and a box to add one (or a prompt to sign in). */
export function LobbyReplies({ venueId, postId, canReply, onRequestJoin, onReplied }: LobbyRepliesProps) {
  const t = useReplyThread(venueId, postId, onReplied);
  const remaining = LOBBY_REPLY_MAX - t.draft.length;

  return (
    <div className="mt-2 space-y-3 rounded-2xl bg-[#f6f1e4]/70 p-3">
      {t.comments === null && !t.loadFailed && (
        <div role="status" aria-label="Loading comments" className="space-y-2">
          <div className="shimmer h-8 rounded-xl" />
          <div className="shimmer h-8 w-4/5 rounded-xl" />
        </div>
      )}
      {t.comments?.length === 0 && <p className="text-[12.5px] text-neutral-500">No comments yet. Be the first to say something kind.</p>}

      {t.comments?.map((c) => (
        <div key={c.id} className={`flex gap-2.5 transition-opacity ${isPending(c) ? 'opacity-60' : ''}`}>
          <LobbyAvatar name={c.author?.name ?? 'You'} emoji={c.author?.avatar ?? '☕'} url={c.author?.avatar_url ?? null} small />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] leading-tight">
              <span className="font-semibold text-neutral-950">{c.author?.name ?? 'You'}</span>{' '}
              <span className="text-neutral-400">{isPending(c) ? 'sending…' : timeAgo(c.created_at)}</span>
            </p>
            <p className="mt-0.5 whitespace-pre-line break-words text-[13.5px] leading-relaxed text-neutral-800">{c.content}</p>
          </div>
        </div>
      ))}

      {t.error && <p role="alert" className="text-xs font-medium text-rose-600">{t.error}</p>}

      {canReply ? (
        <form onSubmit={(e) => { e.preventDefault(); void t.send(); }} className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <input value={t.draft} onChange={(e) => t.setDraft(e.target.value)} maxLength={LOBBY_REPLY_MAX} placeholder="Add a comment…" aria-label="Add a comment" enterKeyHint="send"
              className="h-11 w-full rounded-full border border-neutral-200 bg-white pl-4 pr-3 text-[16px] focus:border-neutral-900 focus:outline-none" />
            {remaining < 60 && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] tabular-nums text-neutral-400">{remaining}</span>}
          </div>
          <button type="submit" disabled={!t.draft.trim()} aria-label="Send comment"
            className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-zinc-950 text-white transition-opacity active:scale-95 disabled:opacity-35">
            <SendHorizonal className="h-4 w-4" />
          </button>
        </form>
      ) : (
        <button type="button" onClick={onRequestJoin} className="min-h-10 cursor-pointer text-[13px] font-semibold text-neutral-900 underline">Sign in to comment</button>
      )}
    </div>
  );
}

export default LobbyReplies;
