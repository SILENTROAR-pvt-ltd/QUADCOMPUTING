'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, X } from 'lucide-react';
import { fitPhotoBlob } from '@/lib/guest/fit-photo';
import { LOBBY_CONTENT_MAX } from '@/lib/guest/lobby-rules';
import type { LobbyPostView } from '@/lib/services/lobby/lobby-post-view';
import { MemoryPostcard, POSTCARD_SERIF } from './MemoryPostcard';
import { LOUNGE_MEDIA } from './lounge-media';

type Outcome = { ok: true; value: LobbyPostView } | { ok: false; error: string };

interface PostcardComposerProps {
  venueName: string;
  table: string;
  guestName: string;
  onClose: () => void;
  onPost: (input: { kind: 'moment'; content: string; table: string | null; photo: Blob }) => Promise<Outcome>;
  onPosted: () => void;
}

/**
 * Write a postcard: a photo from the day and a line to remember it by, laid out as the postcard it will become. What the
 * guest sees here is what the lobby shows. It is shared as a "moment" under the guest's own account.
 */
export function PostcardComposer({ venueName, table, guestName, onClose, onPost, onPosted }: PostcardComposerProps) {
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const today = useRef(new Date().toISOString()).current;

  useEffect(() => {
    if (!photo) { setPreview(null); return; }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [onClose, busy]);

  const pick = async (file: File | undefined, input: HTMLInputElement | null) => {
    if (!file) return;
    setError(null);
    setReading(true);
    try {
      setPhoto(await fitPhotoBlob(file));
    } catch (e: any) {
      setError(e?.message || 'That photo could not be added.');
    } finally {
      setReading(false);
      if (input) input.value = '';
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!photo) return setError('Add a photo to your postcard first.');
    setBusy(true);
    setError(null);
    const out = await onPost({ kind: 'moment', content: text.trim(), table: table || null, photo });
    setBusy(false);
    if (!out.ok) return setError(out.error);
    onPosted();
  };

  const signature = `${guestName || 'A guest'}${table ? ` · Table ${table}` : ''}`;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-zinc-950/45 sm:items-center sm:p-6" onClick={() => { if (!busy) onClose(); }}>
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="postcard-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[94dvh] w-full max-w-md flex-col overflow-y-auto rounded-t-[28px] bg-[#f6f1e4] px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] pt-5 shadow-2xl sm:rounded-[28px]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#8b7b5f]">Leave a memory</p>
            <h2 id="postcard-title" className="mt-1 text-[24px] leading-tight text-zinc-950" style={POSTCARD_SERIF}>Write a postcard</h2>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-zinc-500 hover:bg-black/5 disabled:opacity-40 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 px-1">
          <MemoryPostcard
            id="compose"
            venue={venueName}
            dateIso={today}
            signature={signature}
            photo={
              preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- a local preview of the guest's own photo
                <img src={preview} alt="Your photo" className="h-full w-full object-cover" />
              ) : (
                <button
                  type="button"
                  onClick={() => galleryRef.current?.click()}
                  className="relative flex h-full w-full flex-col items-center justify-center gap-2 border-2 border-dashed border-[#cdbf9f] bg-[#efe7d3] text-[#6f6046] cursor-pointer"
                >
                  {/* A faded example of a moment worth sharing, behind the invitation to add one. */}
                  {/* eslint-disable-next-line @next/next/no-img-element -- a 26 KB WebP from public/media */}
                  <img src={LOUNGE_MEDIA.flatlay} alt="" width={640} height={480} loading="lazy" decoding="async" draggable={false} className="absolute inset-0 h-full w-full object-cover opacity-30" />
                  <span className="relative flex flex-col items-center gap-2">
                  {reading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" aria-hidden />}
                  <span className="text-[12px] font-semibold uppercase tracking-[0.18em]">{reading ? 'Preparing…' : 'Add your photo'}</span>
                  </span>
                </button>
              )
            }
            caption={
              <textarea
                value={text}
                maxLength={LOBBY_CONTENT_MAX}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                aria-label="Your memory"
                placeholder="Write a line to remember this by…"
                className="block min-h-[84px] w-full resize-none bg-transparent p-0 text-[17px] italic leading-[28px] text-[#2b2a33] placeholder:text-[#b3a78c] focus:outline-none"
                style={POSTCARD_SERIF}
              />
            }
          />
        </div>
        <p className="mt-2 text-right text-[11px] text-[#a89a7c]">{text.length}/{LOBBY_CONTENT_MAX}</p>

        <div className="mt-2 grid grid-cols-2 gap-2.5">
          <button type="button" onClick={() => cameraRef.current?.click()} disabled={busy || reading} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#d9cfb6] bg-white/70 text-[13px] font-semibold text-zinc-800 hover:bg-white disabled:opacity-50 cursor-pointer">
            <Camera className="h-4 w-4" aria-hidden /> Take a photo
          </button>
          <button type="button" onClick={() => galleryRef.current?.click()} disabled={busy || reading} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#d9cfb6] bg-white/70 text-[13px] font-semibold text-zinc-800 hover:bg-white disabled:opacity-50 cursor-pointer">
            <ImagePlus className="h-4 w-4" aria-hidden /> {photo ? 'Change photo' : 'From gallery'}
          </button>
        </div>

        {error && <p role="alert" className="mt-3 text-center text-[12.5px] font-medium text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={busy || reading || !photo}
          className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-zinc-950 text-[14px] font-semibold text-white shadow-[0_14px_26px_-14px_rgba(0,0,0,0.7)] transition-colors hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-45 cursor-pointer"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {busy ? 'Posting your postcard…' : 'Post it to the lobby'}
        </button>
        <p className="mt-2.5 text-center text-[11px] leading-snug text-[#a89a7c]">Everyone at {venueName || 'the venue'} can see it, with your name and table.</p>

        <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Choose a photo from your gallery" onChange={(e) => void pick(e.target.files?.[0], e.target)} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" aria-label="Take a photo" onChange={(e) => void pick(e.target.files?.[0], e.target)} />
      </form>
    </div>
  );
}

export default PostcardComposer;
