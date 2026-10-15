'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, SendHorizonal } from 'lucide-react';
import { addLobbyReply, fetchLobbyReplies } from '@/lib/guest/lobby-engagement-client';
import { LOBBY_REPLY_MAX } from '@/lib/guest/lobby-rules';
import type { LobbyReplyView } from '@/lib/services/lobby/lobby-reply-view';
import { LobbyAvatar } from './LobbyAvatar';
import { timeAgo } from './lobby-format';

interface LobbyRepliesProps {
  venueId: string;
  postId: string;
  canReply: boolean;
  onRequestJoin: () => void;
  /** Tells the post a comment was added (+1) or taken back after it failed (-1). */
  onReplied: (delta?: number) => void;
}

/**
 * The comments under a post. A comment appears the moment it is sent and is taken back, with the words returned to the box,
 * if the venue could not take it. Replies are one short line of text.
 */
export function LobbyReplies({ venueId, postId, canReply, onRequestJoin, onReplied }: LobbyRepliesProps) {
  const [comments, setComments] = useState<LobbyReplyView[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const sending = useRef(false);

  useEffect(() => {
    let live = true;
    fetchLobbyReplies(venueId, postId).then((out) => {
      if (!live) return;
      if (out.ok) setComments(out.value);
      else setLoadError(out.error);
    });
    return () => { live = false; };
  }, [venueId, postId]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending.current) return;
    sending.current = true;
    setSendError(null);

    // Shown at once, as if it had already gone through.
    const tempId = `pending-${Date.now()}`;
    const pending = { id: tempId, content, created_at: new Date().toISOString(), author: null } as unknown as LobbyReplyView;
    setComments((prev) => [...(prev ?? []), pending]);
    setDraft('');
    onReplied(1);

    const out = await addLobbyReply(venueId, postId, content);
    sending.current = false;
    if (out.ok) {
      setComments((prev) => (prev ?? []).map((c) => (c.id === tempId ? out.value : c)));
    } else {
      setComments((prev) => (prev ?? []).filter((c) => c.id !== tempId));
      setDraft(content);
      setSendError(out.error);
      onReplied(-1);
    }
  };

  const error = loadError ?? sendError;
  const remaining = LOBBY_REPLY_MAX - draft.length;

  return (
    <div className="mt-2 space-y-3 rounded-2xl bg-[#f6f1e4]/70 p-3">
      {comments === null && !loadError && (
        <p className="flex items-center gap-2 text-xs text-neutral-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading comments…</p>
      )}
      {comments?.length === 0 && <p className="text-[12.5px] text-neutral-500">No comments yet. Be the first to say something kind.</p>}

      {comments?.map((c) => {
        const pending = c.id.startsWith('pending-');
        return (
          <div key={c.id} className={`flex gap-2.5 transition-opacity ${pending ? 'opacity-60' : ''}`}>
            <LobbyAvatar name={c.author?.name ?? 'You'} emoji={c.author?.avatar ?? '☕'} url={c.author?.avatar_url ?? null} small />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] leading-tight">
                <span className="font-semibold text-neutral-950">{c.author?.name ?? 'You'}</span>{' '}
                <span className="text-neutral-400">{pending ? 'sending…' : timeAgo(c.created_at)}</span>
              </p>
              <p className="mt-0.5 whitespace-pre-line break-words text-[13.5px] leading-relaxed text-neutral-800">{c.content}</p>
            </div>
          </div>
        );
      })}

      {error && <p role="alert" className="text-xs font-medium text-rose-600">{error}</p>}

      {canReply ? (
        <form onSubmit={send} className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={LOBBY_REPLY_MAX}
              placeholder="Add a comment…"
              aria-label="Add a comment"
              enterKeyHint="send"
              className="h-10 w-full rounded-full border border-neutral-200 bg-white pl-4 pr-3 text-[14px] focus:border-neutral-900 focus:outline-none"
            />
            {remaining < 60 && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] tabular-nums text-neutral-400">{remaining}</span>}
          </div>
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Send comment"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-white transition-opacity disabled:opacity-35 cursor-pointer active:scale-95"
          >
            <SendHorizonal className="h-4 w-4" />
          </button>
        </form>
      ) : (
        <button type="button" onClick={onRequestJoin} className="text-[13px] font-semibold text-neutral-900 underline cursor-pointer">
          Sign in to comment
        </button>
      )}
    </div>
  );
}

export default LobbyReplies;
