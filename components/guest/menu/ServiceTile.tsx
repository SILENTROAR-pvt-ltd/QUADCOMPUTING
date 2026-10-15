'use client';

import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

export const SERVICE_SERIF = { fontFamily: "'Playfair Display', Georgia, serif" } as const;

interface ServiceTileProps {
  title: string;
  tag?: string;
  price?: number | string | null;
  image?: string | null;
  onOpen: () => void;
  className?: string;
}

/** A compact rectangular tile: photo on the left, the category, name and price beside it. Used for every venue service. */
export function ServiceTile({ title, tag = 'Service', price, image, onOpen, className = '' }: ServiceTileProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group flex items-center gap-3 rounded-2xl border border-[#e6d9b8] bg-gradient-to-b from-[#fffdf8] to-[#faf4e4] p-2.5 text-left shadow-[0_10px_22px_-18px_rgba(10,50,34,0.55)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#c9a24a]/70 active:scale-[0.99] cursor-pointer ${className}`}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- the venue-uploaded photo; images.unoptimized is set, so next/image would not resize it either
        <img src={image} alt="" loading="lazy" decoding="async" className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-[#e6d9b8]" />
      ) : (
        <span aria-hidden className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-[#0A3222] text-amber-200 ring-1 ring-[#c9a24a]/50">
          <Sparkles className="h-5 w-5" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8a6d2b]">{tag}</span>
        <span className="mt-0.5 line-clamp-2 text-[14px] leading-tight text-zinc-950" style={SERVICE_SERIF}>{title}</span>
        <span className="mt-1 flex items-center justify-between text-[11.5px]">
          <span className="font-semibold text-zinc-800">{price ? `₹${price}` : 'On request'}</span>
          <ArrowRight className="h-3.5 w-3.5 text-[#0A3222] transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
        </span>
      </span>
    </button>
  );
}

export default ServiceTile;
