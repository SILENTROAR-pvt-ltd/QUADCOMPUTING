// components/guest/lobby/VaultPhotoCard.tsx
'use client';

import React from 'react';
import { ZoomIn, Clock } from 'lucide-react';
import type { VaultPhoto } from './vault.constants';

interface VaultPhotoCardProps {
  item: VaultPhoto;
  onSelect: (item: VaultPhoto) => void;
}

/** One moment as an ivory card, in the same style as the menu's venue-service tiles. */
export function VaultPhotoCard({ item, onSelect }: VaultPhotoCardProps) {
  const when = item.timeTag || item.time_tag || [item.date, item.time].filter(Boolean).join(' · ');
  return (
    <article
      onClick={() => onSelect(item)}
      className="group flex h-full cursor-pointer flex-col rounded-2xl border border-neutral-200/80 bg-white p-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-20px_rgba(0,0,0,0.35)] active:scale-[0.98]"
    >
      <div className="relative mb-3 aspect-[4/3] w-full overflow-hidden rounded-xl bg-zinc-100">
        {/* eslint-disable-next-line @next/next/no-img-element -- the venue-uploaded photo; images.unoptimized is set */}
        <img src={item.imageUrl} alt={item.title} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        <span className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-zinc-900 shadow-sm">
          <ZoomIn className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
      <div className="px-0.5 pb-0.5">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[9.5px] font-medium uppercase tracking-[0.18em] text-zinc-400">
          <span className="min-w-0 max-w-full">{item.category || 'Moment'}</span>
          {when && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#0A3222]/[0.07] px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-[#0A3222]">
              <Clock className="h-3 w-3" aria-hidden /> {when}
            </span>
          )}
        </p>
        <h4 className="mt-1.5 line-clamp-2 text-[17px] leading-tight text-zinc-950" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{item.title}</h4>
        {item.description && <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-zinc-500">{item.description}</p>}
      </div>
    </article>
  );
}

export default VaultPhotoCard;
