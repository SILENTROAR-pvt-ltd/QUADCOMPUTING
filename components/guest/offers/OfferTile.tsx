'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import type { VenueLiveOffer } from '@/types/offers';
import { press } from '@/components/guest/menu/motion';

/** One offer as a small rectangular tile: the saving in serif type, the offer's name beneath, and an arrow. */
export function OfferTile({ offer, onOpen, className = '' }: { offer: VenueLiveOffer; onOpen: () => void; className?: string }) {
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      aria-label={`${offer.discount_badge}: ${offer.title}. Open offer`}
      {...press}
      className={`group relative flex h-[68px] cursor-pointer flex-col justify-between overflow-hidden rounded-xl border border-[#d9d0f2] bg-gradient-to-br from-[#f6f2ff] via-[#efe9fd] to-[#e7defa] px-3 py-2 text-left shadow-[0_8px_22px_-10px_rgba(139,112,214,0.55),inset_0_1px_0_rgba(255,255,255,0.85)] hover:border-[#b9a8ec] ${className}`}
    >
      {/* A soft glow in the corner, the lavender light behind the tile. */}
      <span aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(196,176,245,0.75),rgba(196,176,245,0)_70%)]" />
      <span className="relative line-clamp-2 pr-5 font-sans text-[12.5px] font-bold uppercase leading-[1.15] tracking-[0.02em] text-[#2e2358] antialiased">{offer.discount_badge}</span>
      <span className="relative truncate font-sans text-[11px] font-medium capitalize leading-none text-[#6b5f94] antialiased">{offer.title.toLowerCase()}</span>
      <span aria-hidden className="absolute right-2 top-2 grid h-4 w-4 place-items-center rounded-full bg-[#4a3a8c] text-white transition-transform duration-200 group-hover:translate-x-0.5">
        <ArrowRight className="h-2.5 w-2.5" />
      </span>
    </motion.button>
  );
}
