'use client';

import React, { useRef } from 'react';
import { ArrowLeft, ArrowRight, ImagePlus, Images, Loader2, X } from 'lucide-react';
import { GALLERY_CAPTION_MAX, GALLERY_MAX } from '@/lib/services/menu-info/gallery';
import { useGalleryVault } from './useGalleryVault';

/**
 * The memory vault: photos of the venue itself (the room at golden hour, the courtyard lit up, a full table, the people)
 * with a line each. Guests see them as a gallery at the foot of the menu, so the place stays with them after they leave.
 */
export function GalleryVaultCard() {
  const v = useGalleryVault();
  const input = useRef<HTMLInputElement>(null);
  const full = v.photos.length >= GALLERY_MAX;

  return (
    <section className="mb-5 rounded-2xl border border-[#e6d9b8] bg-gradient-to-br from-[#fffbf2] to-white shadow-xs">
      <div className="flex items-start gap-3 px-4 pt-4 sm:px-5">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#0f2a1e] text-[#d9c193]"><Images className="h-4 w-4" aria-hidden /></span>
        <div className="min-w-0">
          <p className="font-serif text-base text-zinc-950">Memory vault</p>
          <p className="text-xs text-zinc-500">Up to {GALLERY_MAX} photos of your venue: corners, evenings, people. Guests see them as a gallery at the foot of the menu.</p>
        </div>
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        {v.loading ? (
          <p className="flex items-center gap-2 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>
        ) : (
          <>
            {v.photos.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#e6d9b8] bg-white/70 px-4 py-5 text-center text-sm text-zinc-500">No photos yet. Add the moments that make your place feel like yours.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {v.photos.map((p, i) => (
                  <li key={p.url} className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                    <div className="relative aspect-[4/3] bg-zinc-100">
                      {/* eslint-disable-next-line @next/next/no-img-element -- the venue's own photo in its vault */}
                      <img src={p.url} alt={p.caption || `Vault photo ${i + 1}`} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => void v.remove(p.url)} disabled={Boolean(v.busy)} aria-label={`Remove photo ${i + 1}`}
                        className="absolute right-1.5 top-1.5 grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-white/90 text-rose-600 shadow-sm disabled:opacity-50"><X className="h-4 w-4" /></button>
                    </div>
                    <div className="flex items-center gap-1 p-1.5">
                      <button type="button" onClick={() => v.move(i, -1)} disabled={i === 0} aria-label={`Move photo ${i + 1} earlier`} className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg text-zinc-600 active:bg-zinc-100 disabled:opacity-30"><ArrowLeft className="h-4 w-4" /></button>
                      <input value={p.caption} onChange={(e) => v.caption(p.url, e.target.value)} maxLength={GALLERY_CAPTION_MAX} placeholder="A line for guests"
                        aria-label={`Caption for photo ${i + 1}`} className="h-9 min-w-0 flex-1 rounded-lg border border-zinc-200 px-2 text-[16px] outline-none focus:border-zinc-900 sm:text-xs" />
                      <button type="button" onClick={() => v.move(i, 1)} disabled={i === v.photos.length - 1} aria-label={`Move photo ${i + 1} later`} className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg text-zinc-600 active:bg-zinc-100 disabled:opacity-30"><ArrowRight className="h-4 w-4" /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" aria-label="Choose photos for the memory vault"
              onChange={(e) => { void v.add(e.target.files); e.target.value = ''; }} />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" onClick={() => input.current?.click()} disabled={full || Boolean(v.busy)}
                className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#e6d9b8] bg-white px-5 text-[13px] font-semibold text-[#5c4824] active:bg-[#fffbf2] disabled:opacity-50">
                <ImagePlus className="h-4 w-4" aria-hidden /> {full ? `${GALLERY_MAX} photos added` : 'Add photos'}
              </button>
              <div className="flex items-center justify-between gap-3">
                <p role={v.message?.kind === 'err' ? 'alert' : 'status'} className={`text-xs ${v.message?.kind === 'err' ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {v.busy ?? v.message?.text ?? (v.dirty ? 'Unsaved captions or order' : '')}
                </p>
                <button type="button" onClick={() => void v.save()} disabled={Boolean(v.busy) || !v.dirty}
                  className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white disabled:opacity-40">
                  {v.busy === 'Saving…' && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save vault
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default GalleryVaultCard;
