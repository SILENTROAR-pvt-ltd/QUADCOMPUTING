'use client';

import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import s from '@/components/guest/luxe/luxe-guest.module.css';

// The house serif of the guest app (var(--font-luxe), set on the page), with Playfair standing in until it loads.
export const SERVICE_SERIF = { fontFamily: "var(--font-luxe), 'Playfair Display', Georgia, serif" } as const;

interface ServiceTileProps {
  title: string;
  tag?: string;
  price?: number | string | null;
  image?: string | null;
  onOpen: () => void;
  className?: string;
}

/** A compact tile: a round photo drifting in slow motion, the category, the name in serif and the price. Every venue service. */
export function ServiceTile({ title, tag = 'Service', price, image, onOpen, className = '' }: ServiceTileProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group flex items-center gap-3 rounded-[22px] border border-[#e8dfcc] bg-[#fbf9f4] p-2.5 pr-3.5 text-left shadow-[0_16px_30px_-26px_rgba(16,35,26,0.6)] transition-all duration-500 hover:-translate-y-0.5 hover:border-[#d9c193] active:scale-[0.99] cursor-pointer ${className}`}
    >
      <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full shadow-[0_0_0_2px_#fbf9f4,0_0_0_3px_rgba(176,141,87,0.5)]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- the venue-uploaded photo; images.unoptimized is set, so next/image would not resize it either
          <img src={image} alt="" loading="lazy" decoding="async" className={`${s.slowmo} h-full w-full object-cover`} />
        ) : (
          <span aria-hidden className="grid h-full w-full place-items-center bg-[#0f2a1e] text-[#d9c193]"><Sparkles className="h-5 w-5" /></span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[9px] font-semibold uppercase tracking-[0.24em] text-[#8a6d3f]">{tag}</span>
        <span className="mt-0.5 line-clamp-2 text-[17px] font-medium leading-[1.1] text-[#10231a]" style={SERVICE_SERIF}>{title}</span>
        <span className="mt-1 flex items-center justify-between text-[11.5px]">
          <span className="font-semibold tabular-nums text-[#0f2a1e]">{price ? `₹${price}` : 'On request'}</span>
          <ArrowRight className="h-3.5 w-3.5 text-[#b08d57] transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
        </span>
      </span>
    </button>
  );
}

export default ServiceTile;
