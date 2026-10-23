'use client';

import React, { useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { LOBBY_CONTENT_MAX, type LobbyKind } from '@/lib/guest/lobby-rules';
import type { LobbyPostView } from '@/lib/services/lobby/lobby-post-view';
import { POSTCARD_SERIF } from './MemoryPostcard';
import { LOUNGE_MEDIA, LOUNGE_TINT } from './lounge-media';

type Outcome = { ok: true; value: LobbyPostView } | { ok: false; error: string };

interface LobbyComposerProps {
  venueName: string;
  table: string;
  canPost: boolean;
  onRequestJoin: () => void;
  onPost: (input: { kind: LobbyKind; content: string; table: string | null; photo?: Blob | null }) => Promise<Outcome>;
  /** Opens the postcard composer. */
  onWritePostcard: () => void;
}

/**
 * The top of the lobby: an invitation to write a postcard (a photo and a line, the lobby's main thing), and for a signed-in
 * guest a slim box for a quick message. Posts are signed with the guest's account.
 */
export function LobbyComposer({ venueName, table, canPost, onRequestJoin, onPost, onWritePostcard }: LobbyComposerProps) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content) return setError('Write something to share.');
    setBusy(true);
    setError(null);
    const out = await onPost({ kind: 'message', content, table: table || null, photo: null });
    setBusy(false);
    if (!out.ok) return setError(out.error);
    setText('');
  };

  return (
    <div className="space-y-3">
      {/* An unwritten postcard, waiting to be filled in */}
      <div className="relative -rotate-[0.8deg] rounded-[18px] border border-[#e8dfcc] bg-[#fffdf8] p-4 shadow-[0_24px_40px_-28px_rgba(16,35,26,0.55)]">
        <span aria-hidden className="absolute right-4 top-4 block h-[66px] w-[54px] rotate-3 border-[3px] border-dashed border-[#d6cbb0] bg-white p-[3px] shadow-[0_6px_12px_-6px_rgba(40,30,10,0.5)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- a stamp cut from a 26 KB WebP in public/media */}
          <img src={LOUNGE_MEDIA.flatlay} alt="" width={640} height={480} loading="lazy" decoding="async" draggable={false} className="h-full w-full object-cover" style={{ backgroundColor: LOUNGE_TINT.flatlay }} />
        </span>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8a6d3f]">Postcard</p>
        <h3 className="mt-1 max-w-[220px] text-[25px] font-medium leading-[1.08] text-[#10231a]" style={POSTCARD_SERIF}>
          Leave a memory at {venueName || 'the venue'}
        </h3>
        <p className="mt-1.5 max-w-[250px] text-[12.5px] leading-snug text-zinc-500">A photo from today and a line to remember it by, pinned for everyone here to see.</p>
        <div aria-hidden className="mt-3 space-y-[9px]">
          <span className="block h-px w-[72%] bg-[#e3d9c0]" />
          <span className="block h-px w-[54%] bg-[#e3d9c0]" />
        </div>
        <button
          type="button"
          onClick={canPost ? onWritePostcard : onRequestJoin}
          className="group mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] px-5 text-[13px] font-semibold text-[#f5f1e8] shadow-[0_12px_24px_-14px_rgba(15,42,30,0.8)] ring-1 ring-[#d9c193]/30 transition-colors active:scale-[0.98] cursor-pointer"
        >
          {canPost ? 'Write a postcard' : 'Sign in to write a postcard'}
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
        </button>
      </div>

      {canPost && (
        <form onSubmit={submit} className="flex items-end gap-2 rounded-[22px] border border-[#e8dfcc] bg-[#fbf9f4] p-2 pl-3.5">
          <textarea
            value={text}
            maxLength={LOBBY_CONTENT_MAX}
            onChange={(e) => setText(e.target.value)}
            rows={1}
            aria-label="Your message"
            placeholder="Say something to the room"
            className="max-h-28 min-h-[40px] flex-1 resize-none bg-transparent py-2 text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
          />
          <button type="submit" disabled={busy || !text.trim()} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] px-4 text-[13px] font-semibold text-[#f5f1e8] disabled:opacity-40 cursor-pointer">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Send
          </button>
        </form>
      )}
      {error && <p role="alert" className="px-1 text-xs font-medium text-rose-600">{error}</p>}    </div>
  );
}

export default LobbyComposer;
