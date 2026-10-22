'use client';

import React, { useRef } from 'react';
import { Camera, Link2, Loader2, Trash2, Type } from 'lucide-react';
import type { OfferPhoto, PhotoMode } from '../../hooks/useOfferPhoto';

const MODES: Array<{ id: PhotoMode; label: string; Icon: React.FC<{ className?: string }> }> = [
  { id: 'upload', label: 'Upload', Icon: Camera },
  { id: 'link', label: 'Photo link', Icon: Link2 },
  { id: 'none', label: 'No photo', Icon: Type },
];

/** A photo (an offer's, an event's banner): from the phone's camera or gallery, from a link, or none. */
export function OfferPhotoPicker({ photo, label = 'Photo', noneNote = 'A text-only offer: guests see its tag, title and line.' }: { photo: OfferPhoto; label?: string; noneNote?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500">{label}</p>
      <div role="radiogroup" aria-label="Photo source" className="grid grid-cols-3 gap-1.5 rounded-xl border border-neutral-200 bg-white p-1">
        {MODES.map(({ id, label, Icon }) => (
          <button key={id} type="button" role="radio" aria-checked={photo.mode === id} onClick={() => photo.choose(id)}
            className={`flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold ${photo.mode === id ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900'}`}>
            <Icon className="h-4 w-4 shrink-0" /> <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      {photo.imageUrl ? (
        <div className="relative mt-2 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
          {/* eslint-disable-next-line @next/next/no-img-element -- a stored photo of any size, shown as a preview */}
          <img src={photo.imageUrl} alt="Offer photo" className="aspect-[16/9] w-full object-cover" />
          <button type="button" onClick={photo.clear}
            className="absolute right-2 top-2 inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-white/95 px-3 text-[13px] font-semibold text-rose-700 shadow">
            <Trash2 className="h-4 w-4" /> Remove
          </button>
        </div>
      ) : photo.mode === 'upload' ? (
        <>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
            onChange={(e) => { void photo.fromFile(e.target.files?.[0]); e.target.value = ''; }} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={photo.busy}
            className="mt-2 flex h-28 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400 disabled:opacity-60">
            {photo.busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
            <span className="text-[13px] font-semibold">{photo.busy ? 'Saving the photo…' : 'Take a photo or choose from gallery'}</span>
            <span className="text-[11px] text-neutral-400">JPG, PNG or WebP · resized on your phone before upload</span>
          </button>
        </>
      ) : photo.mode === 'link' ? (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input type="url" inputMode="url" placeholder="https://… photo link" value={photo.link} onChange={(e) => photo.setLink(e.target.value)}
            className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3.5 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none sm:text-sm" />
          <button type="button" onClick={() => void photo.fromLink()} disabled={photo.busy || !photo.link.trim()}
            className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-neutral-900 px-4 text-[13px] font-semibold text-white disabled:opacity-50">
            {photo.busy && <Loader2 className="h-4 w-4 animate-spin" />} Use this photo
          </button>
        </div>
      ) : (
        <p className="mt-2 rounded-xl bg-neutral-100 px-3 py-2 text-[12px] text-neutral-600">{noneNote}</p>
      )}
      {photo.error && <p role="alert" className="mt-1.5 text-[12px] font-medium text-rose-700">{photo.error}</p>}
    </div>
  );
}
