'use client';

import React, { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { uploadMedia } from './api';
import { Notice } from './ui';

export interface Photo { path: string; url: string | null }

/** Upload a gallery (plan covers or property photos). Keeps storage paths; shows previews. */
export function PhotoUploader({ kind, photos, onChange, max = 8 }: { kind: 'events' | 'properties'; photos: Photo[]; onChange: (p: Photo[]) => void; max?: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const add = async (files: FileList | null) => {
    if (!files) return;
    setBusy(true);
    setError('');
    const next = [...photos];
    for (const f of Array.from(files).slice(0, max - photos.length)) {
      const res = await uploadMedia(kind, f);
      if (res.ok) next.push({ path: res.data.path, url: res.data.url });
      else setError(res.error);
    }
    setBusy(false);
    onChange(next);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {photos.map((p, i) => (
          <span key={p.path} className="relative h-20 w-28 overflow-hidden rounded-xl bg-[#f3ebff]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.url && <img src={p.url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />}
            <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => onChange(photos.filter((x) => x.path !== p.path))}
              className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white"><X className="h-3.5 w-3.5" /></button>
          </span>
        ))}
        {photos.length < max && (
          <button type="button" onClick={() => input.current?.click()} disabled={busy}
            className="grid h-20 w-28 place-items-center rounded-xl border border-dashed border-[#2a1250]/25 text-xs text-[#2a1250]/60 hover:bg-white">
            <span className="flex flex-col items-center gap-1"><ImagePlus className="h-4 w-4" />{busy ? 'Uploading…' : 'Add photos'}</span>
          </button>
        )}
      </div>
      <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { void add(e.target.files); e.target.value = ''; }} />
      {error && <div className="mt-2"><Notice>{error}</Notice></div>}
    </div>
  );
}
