'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
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
  onReplied: () => void;
}

/** The thread under a post: the replies so far, and a box to add one. */
export function LobbyReplies({ venueId, postId, canReply, onRequestJoin, onReplied }: LobbyRepliesProps) {
  const [replies, setReplies] = useState<LobbyReplyView[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let live = true;
    fetchLobbyReplies(venueId, postId).then((out) => {
      if (!live) return;
      if (out.ok) setReplies(out.value);
      else setLoadError(out.error);
    });
    return () => { live = false; };
  }, [venueId, postId]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setSendError(null);
    const out = await addLobbyReply(venueId, postId, content);
    setSending(false);
    if (!out.ok) return setSendError(out.error);
    setReplies((prev) => [...(prev ?? []), out.value]);
    setDraft('');
    onReplied();
  };

  const error = loadError ?? sendError;

  return (
    <div className="mt-3 space-y-3 rounded-2xl bg-neutral-50 p-3">
      {replies === null && !loadError && (
        <p className="flex items-center gap-2 text-xs text-neutral-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading replies…</p>
      )}
      {replies?.length === 0 && <p className="text-xs text-neutral-500">No replies yet. Be the first.</p>}
      {replies?.map((r) => (
        <div key={r.id} className="flex gap-2.5">
          <LobbyAvatar name={r.author?.name ?? 'Guest'} emoji={r.author?.avatar ?? '☕'} url={r.author?.avatar_url ?? null} small />
          <div className="min-w-0">
            <p className="text-xs">
              <span className="font-semibold text-neutral-950">{r.author?.name ?? 'Guest'}</span>{' '}
              <span className="text-neutral-400">{timeAgo(r.created_at)}</span>
            </p>
            <p className="whitespace-pre-line text-[13px] leading-relaxed text-neutral-800">{r.content}</p>
          </div>
        </div>
      ))}
      {error && <p role="alert" className="text-xs font-medium text-rose-600">{error}</p>}

      {canReply ? (
        <form onSubmit={send} className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={LOBBY_REPLY_MAX}
            placeholder="Write a reply"
            aria-label="Write a reply"
            className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            aria-label="Send reply"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-white disabled:opacity-40 cursor-pointer"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        </form>
      ) : (
        <button type="button" onClick={onRequestJoin} className="text-xs font-semibold text-neutral-900 underline cursor-pointer">
          Sign in to reply
        </button>
      )}
    </div>
  );
}

export default LobbyReplies;
