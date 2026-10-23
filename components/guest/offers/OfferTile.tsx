'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Ticket } from 'lucide-react';
import type { VenueLiveOffer } from '@/types/offers';
import { press } from '@/components/guest/menu/motion';
import { LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';

/**
 * One offer as a quiet ivory card: its photo (or a forest coin), what it is in small gold capitals, the saving in the
 * house serif, and a forest arrow. `compact` drops the photo, for three offers side by side.
 */
export function OfferTile({ offer, onOpen, className = '', compact = false }: { offer: VenueLiveOffer; onOpen: () => void; className?: string; compact?: boolean }) {
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      aria-label={`${offer.discount_badge}: ${offer.title}. Open offer`}
      {...press}
      className={`group relative flex h-[72px] cursor-pointer items-center gap-3 overflow-hidden rounded-[20px] border border-[#e8dfcc] bg-[#fbf9f4] text-left shadow-[0_14px_28px_-22px_rgba(15,42,30,0.55)] transition-colors hover:border-[#d9c193] ${compact ? 'px-3' : 'pl-2.5 pr-3'} ${className}`}
    >
      {!compact && (
        <span className="relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[14px] bg-[radial-gradient(circle_at_30%_20%,#1d4632,#0f2a1e)]">
          {offer.image_url
            // eslint-disable-next-line @next/next/no-img-element -- the offer's photo, stored by the venue
            ? <img src={offer.image_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
            : <Ticket aria-hidden className="absolute inset-0 m-auto h-5 w-5 text-[#d9c193]" />}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[9px] font-semibold uppercase tracking-[0.22em] text-[#8a6d3f]">{offer.title}</span>
        <span className="mt-0.5 line-clamp-2 block text-[1.05rem] font-medium leading-[1.1] text-[#10231a]" style={LUXE_SERIF}>{offer.discount_badge}</span>
      </span>
      <span aria-hidden className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] text-[#d9c193] transition-transform duration-200 group-hover:translate-x-0.5 ${compact ? 'h-6 w-6' : 'h-8 w-8'}`}>
        <ArrowRight className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      </span>
    </motion.button>
  );
}
