'use client';

import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button, FOCUS, Notice, field } from '../ui';
import { Sheet } from '../ui-extra';
import { clubFetch, uploadMedia } from '../api';
import { PlacePicker } from '../places/PlacePicker';
import type { PlaceRef } from '../places/types';

interface Draft { path: string; url: string | null; type: 'image' | 'video' }

/** Add to your story: a photo or short clip, the place it is from, and a caption. */
export function StoryAdd({ open, onClose, onPosted }: { open: boolean; onClose: () => void; onPosted: () => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [caption, setCaption] = useState('');
  const [place, setPlace] = useState<PlaceRef | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => { setDraft(null); setCaption(''); setPlace(null); setError(''); };
  const close = () => { reset(); onClose(); };

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setError('');
    setBusy(true);
    const up = await uploadMedia('stories', f);
    setBusy(false);
    if (!up.ok) return setError(up.error);
    setDraft(up.data);
  };

  const share = async () => {
    if (!draft) return;
    setBusy(true);
    const res = await clubFetch('/stories', { body: { media_path: draft.path, caption, place_id: place?.id ?? null } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    reset();
    onPosted();
    onClose();
  };

  return (
    <Sheet open={open} onClose={close} title="Add to your story" focusField={false}>
      {!draft ? (
        <button type="button" onClick={() => file.current?.click()} disabled={busy}
          className={`flex aspect-[9/12] w-full flex-col items-center justify-center gap-3 rounded-[28px] border-2 border-dashed border-[#14261b]/20 bg-white text-center ${FOCUS}`}>
          <span className="grid h-14 w-14 place-items-center rounded-full bg-[#17301f] text-[#c8da4a]"><Upload aria-hidden="true" className="h-6 w-6" /></span>
          <span className="text-sm font-semibold">{busy ? 'Uploading…' : 'Choose a photo or short clip'}</span>
          <span className="text-xs text-[#14261b]/55">JPEG, PNG, WebP, MP4 or WebM</span>
        </button>
      ) : (
        <div className="mx-auto aspect-[9/13] max-h-[42dvh] overflow-hidden rounded-[24px] bg-[#14261b]">
          {draft.url && (draft.type === 'video'
            ? <video src={draft.url} muted autoPlay loop playsInline className="h-full w-full object-cover" />
            // eslint-disable-next-line @next/next/no-img-element
            : <img src={draft.url} alt="Your story" className="h-full w-full object-cover" />)}
        </div>
      )}
      <input ref={file} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" className="hidden"
        onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
      {draft && (
        <div className="mt-4 space-y-4">
          <PlacePicker value={place} onChange={setPlace} label="Where is this?" />
          <input aria-label="Caption" className={field} maxLength={300} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Add a caption (optional)" />
          <Notice>{error}</Notice>
          <Button tone="aura" className="w-full" busy={busy} onClick={share}>Share to your story</Button>
          <p className="text-center text-xs text-[#14261b]/55">Visible for 24 hours. Ranked first for people who follow you{place ? ` and members planning to visit ${place.name}` : ''}.</p>
        </div>
      )}
    </Sheet>
  );
}
