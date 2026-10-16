'use client';

import React from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { LOUNGE_MEDIA } from '../lounge-media';

interface PhotoSlotProps {
  preview: string | null;
  reading: boolean;
  onAdd: () => void;
}

/** The postcard's picture: the guest's photo once chosen, or a dashed invitation to add one over a faded example. */
export function PhotoSlot({ preview, reading, onAdd }: PhotoSlotProps) {
  if (preview) {
    // eslint-disable-next-line @next/next/no-img-element -- a local preview of the guest's own photo
    return <img src={preview} alt="Your photo" className="h-full w-full object-cover" />;
  }
  return (
    <button type="button" onClick={onAdd} className="relative flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed border-[#cdbf9f] bg-[#efe7d3] text-[#6f6046]">
      {/* eslint-disable-next-line @next/next/no-img-element -- a 26 KB WebP from public/media */}
      <img src={LOUNGE_MEDIA.flatlay} alt="" width={640} height={480} loading="lazy" decoding="async" draggable={false} className="absolute inset-0 h-full w-full object-cover opacity-30" />
      <span className="relative flex flex-col items-center gap-2">
        {reading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" aria-hidden />}
        <span className="text-[12px] font-semibold uppercase tracking-[0.18em]">{reading ? 'Preparing…' : 'Add your photo'}</span>
      </span>
    </button>
  );
}
