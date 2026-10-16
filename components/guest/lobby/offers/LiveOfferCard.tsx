'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Bed, Clock, Layers, Sparkles, Utensils } from 'lucide-react';
import type { VenueLiveOffer } from '@/types/offers';
import { press } from '@/components/guest/menu/motion';

const CTA = 'inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-neutral-900 px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-black';

interface LiveOfferCardProps {
  offer: VenueLiveOffer;
  tableNumber: string;
  onClaim: (offer: VenueLiveOffer) => void;
}

/** One live offer: its kind, the discount, the words, how long it lasts, and a button that orders it or claims it. */
export function LiveOfferCard({ offer, tableNumber, onClaim }: LiveOfferCardProps) {
  const isRoom = offer.category === 'room';
  const isFood = offer.category === 'food';
  const Kind = isRoom ? Bed : isFood ? Utensils : Layers;
  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-neutral-200/90 bg-white p-5 shadow-2xs transition-shadow duration-300 hover:shadow-md sm:p-6">
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br from-amber-200/30 to-rose-200/20 blur-2xl transition-transform duration-500 group-hover:scale-125" />
      <div className="relative space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-neutral-200/70 bg-neutral-100 px-2.5 py-0.5 text-[10px] font-semibold text-neutral-700">
            <Kind className="h-3 w-3 text-emerald-700" />
            {isFood ? 'Food & Drink' : isRoom ? 'Stay & Suite' : 'General'}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-mono text-xs font-bold text-amber-900">
            <Sparkles className="h-3 w-3 text-amber-600" /> {offer.discount_badge}
          </span>
        </div>
        <div>
          <h3 className="font-serif text-lg font-medium leading-snug tracking-tight text-neutral-900 sm:text-xl">{offer.title}</h3>
          {offer.description && <p className="mt-1.5 line-clamp-3 text-xs font-light leading-relaxed text-neutral-600 sm:text-[13px]">{offer.description}</p>}
        </div>
      </div>
      <div className="relative mt-4 flex items-center justify-between gap-2 border-t border-neutral-100 pt-4 text-xs">
        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-neutral-400">
          <Clock className="h-3 w-3" />
          {offer.valid_until ? `Valid till ${new Date(offer.valid_until).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}` : 'Active Today'}
        </span>
        {isFood ? (
          <Link href={`/menu?table=${encodeURIComponent(tableNumber)}`} className={CTA}>Order on Menu <ArrowRight className="h-3.5 w-3.5" /></Link>
        ) : (
          <motion.button type="button" onClick={() => onClaim(offer)} {...press} className={CTA}>Claim Deal <ArrowRight className="h-3.5 w-3.5" /></motion.button>
        )}
      </div>
    </div>
  );
}
