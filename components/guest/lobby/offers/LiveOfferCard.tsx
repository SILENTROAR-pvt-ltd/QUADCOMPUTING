'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Bed, Clock, Layers, Utensils } from 'lucide-react';
import type { VenueLiveOffer } from '@/types/offers';
import { press } from '@/components/guest/menu/motion';
import { LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';
import s from '@/components/guest/luxe/luxe-guest.module.css';

const CTA = 'inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] px-4 text-xs font-semibold text-[#f5f1e8] shadow-[0_10px_20px_-12px_rgba(15,42,30,0.85)] ring-1 ring-[#d9c193]/30';

interface LiveOfferCardProps {
  offer: VenueLiveOffer;
  tableNumber: string;
  onClaim: (offer: VenueLiveOffer) => void;
}

/**
 * One live offer as a small invitation: its photo drifting in slow motion (or, without one, a champagne panel with the
 * saving set large in the house serif), the kind, the words, how long it lasts, and a button that orders it or claims it.
 */
export function LiveOfferCard({ offer, tableNumber, onClaim }: LiveOfferCardProps) {
  const isRoom = offer.category === 'room';
  const isFood = offer.category === 'food';
  const Kind = isRoom ? Bed : isFood ? Utensils : Layers;
  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-[26px] border border-[#e8dfcc] bg-[#fbf9f4] shadow-[0_24px_46px_-34px_rgba(15,42,30,0.6)]">
      <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-[#fbf6ec] via-[#f3e7cc] to-[#e6d3a8]">
        {offer.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- the offer's photo, stored by the venue
          <img src={offer.image_url} alt={offer.title} loading="lazy" className={`${s.slowmo} absolute inset-0 h-full w-full object-cover`} />
        ) : (
          <span aria-hidden className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.85),transparent_68%)]" />
        )}
        <div className={`absolute inset-0 ${offer.image_url ? 'bg-[linear-gradient(180deg,transparent_40%,rgba(8,22,15,0.85)_100%)]' : ''}`} />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#f5f1e8]/95 px-2.5 py-1 text-[10px] font-semibold text-[#10231a]">
          <Kind className="h-3 w-3 text-[#8a6d3f]" />
          {isFood ? 'Food & Drink' : isRoom ? 'Stay & Suite' : 'Specials'}
        </span>
        <p className={`absolute inset-x-0 bottom-0 px-4 pb-3 text-[2rem] font-medium uppercase leading-none tracking-[0.02em] ${offer.image_url ? 'text-[#f5f1e8]' : 'text-[#0f2a1e]'}`} style={LUXE_SERIF}>
          {offer.discount_badge}
        </p>
      </div>
      <div className="flex flex-1 flex-col justify-between gap-4 p-4 sm:p-5">
        <div>
          <h3 className="text-[1.45rem] font-medium leading-[1.1] text-[#10231a]" style={LUXE_SERIF}>{offer.title}</h3>
          {offer.description && <p className="mt-1.5 line-clamp-3 text-[12.5px] leading-relaxed text-[#10231a]/60">{offer.description}</p>}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-[#e8dfcc] pt-3.5 text-xs">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a6d3f]">
            <Clock className="h-3 w-3" />
            {offer.valid_until ? `Till ${new Date(offer.valid_until).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}` : 'Today'}
          </span>
          {isFood ? (
            <Link href={`/menu?table=${encodeURIComponent(tableNumber)}`} className={CTA}>Order on menu <ArrowRight className="h-3.5 w-3.5" /></Link>
          ) : (
            <motion.button type="button" onClick={() => onClaim(offer)} {...press} className={CTA}>Claim deal <ArrowRight className="h-3.5 w-3.5" /></motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
