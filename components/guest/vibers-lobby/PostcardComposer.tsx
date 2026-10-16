'use client';

import React, { useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2 } from 'lucide-react';
import { LOBBY_CONTENT_MAX } from '@/lib/guest/lobby-rules';
import type { LobbyPostView } from '@/lib/services/lobby/lobby-post-view';
import { BottomSheet } from '@/components/guest/shared/BottomSheet';
import { MemoryPostcard, POSTCARD_SERIF } from './MemoryPostcard';
import { PhotoSlot } from './composer/PhotoSlot';
import { usePostcardPhoto } from './composer/usePostcardPhoto';

type Outcome = { ok: true; value: LobbyPostView } | { ok: false; error: string };

interface PostcardComposerProps {
  venueName: string;
  table: string;
  guestName: string;
  onClose: () => void;
  onPost: (input: { kind: 'moment'; content: string; table: string | null; photo: Blob }) => Promise<Outcome>;
  onPosted: () => void;
}

const SOFT = 'inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-[#d9cfb6] bg-white/70 text-[13px] font-semibold text-zinc-800 hover:bg-white disabled:opacity-50';

/**
 * Write a postcard: a photo from the day and a line to remember it by, laid out as the postcard it will become. What the
 * guest sees here is what the lobby shows. It is shared as a "moment" under the guest's own account.
 */
export function PostcardComposer({ venueName, table, guestName, onClose, onPost, onPosted }: PostcardComposerProps) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const p = usePostcardPhoto(setError);
  const today = useRef(new Date().toISOString()).current;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!p.photo) return setError('Add a photo to your postcard first.');
    setBusy(true);
    setError(null);
    const out = await onPost({ kind: 'moment', content: text.trim(), table: table || null, photo: p.photo });
    setBusy(false);
    if (!out.ok) return setError(out.error);
    onPosted();
  };

  return (
    <BottomSheet labelledBy="postcard-title" onClose={onClose} locked={busy}>
      <form onSubmit={submit} className="flex flex-col">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#8b7b5f]">Leave a memory</p>
          <h2 id="postcard-title" className="mt-1 text-[24px] leading-tight text-zinc-950" style={POSTCARD_SERIF}>Write a postcard</h2>
        </div>

        <div className="mt-5 px-1">
          <MemoryPostcard
            id="compose" venue={venueName} dateIso={today} signature={`${guestName || 'A guest'}${table ? ` · Table ${table}` : ''}`}
            photo={<PhotoSlot preview={p.preview} reading={p.reading} onAdd={p.openGallery} />}
            caption={
              <textarea value={text} maxLength={LOBBY_CONTENT_MAX} onChange={(e) => setText(e.target.value)} rows={3} aria-label="Your memory"
                placeholder="Write a line to remember this by…" style={POSTCARD_SERIF}
                className="block min-h-[84px] w-full resize-none bg-transparent p-0 text-[17px] italic leading-[28px] text-[#2b2a33] placeholder:text-[#b3a78c] focus:outline-none" />
            }
          />
        </div>
        <p className="mt-2 text-right text-[11px] text-[#a89a7c]">{text.length}/{LOBBY_CONTENT_MAX}</p>

        <div className="mt-2 grid grid-cols-2 gap-2.5">
          <button type="button" onClick={p.openCamera} disabled={busy || p.reading} className={SOFT}><Camera className="h-4 w-4" aria-hidden /> Take a photo</button>
          <button type="button" onClick={p.openGallery} disabled={busy || p.reading} className={SOFT}><ImagePlus className="h-4 w-4" aria-hidden /> {p.photo ? 'Change photo' : 'From gallery'}</button>
        </div>

        {error && <p role="alert" className="mt-3 text-center text-[12.5px] font-medium text-rose-600">{error}</p>}

        <button type="submit" disabled={busy || p.reading || !p.photo}
          className="mt-4 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-zinc-950 text-[14px] font-semibold text-white shadow-[0_14px_26px_-14px_rgba(0,0,0,0.7)] transition-colors hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-45">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {busy ? 'Posting your postcard…' : 'Post it to the lobby'}
        </button>
        <p className="mt-2.5 text-center text-[11px] leading-snug text-[#a89a7c]">Everyone at {venueName || 'the venue'} can see it, with your name and table.</p>

        <input ref={p.gallery} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Choose a photo from your gallery" onChange={(e) => void p.pick(e.target.files?.[0], e.target)} />
        <input ref={p.camera} type="file" accept="image/*" capture="environment" className="sr-only" aria-label="Take a photo" onChange={(e) => void p.pick(e.target.files?.[0], e.target)} />
      </form>
    </BottomSheet>
  );
}

export default PostcardComposer;
