'use client';

import React, { useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { VenueLiveOffer } from '@/types/offers';
import { OfferActionSheet } from '@/components/guest/offers/OfferActionSheet';
import { useLiveOffers } from './offers/useLiveOffers';
import { LiveOfferCard } from './offers/LiveOfferCard';
import { LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';
import s from '@/components/guest/luxe/luxe-guest.module.css';

interface VenueLiveOffersProps {
  venueId?: string;
  tableNumber?: string;
  /** Rendered when the venue has no live offers (default: nothing). */
  emptyState?: React.ReactNode;
}

const CATEGORIES = [
  { key: 'all', label: 'All Specials' },
  { key: 'food', label: 'Food & Drinks' },
  { key: 'room', label: 'Room Deals' },
];

/** The venue's live offers as cards, filterable by kind, kept in step with what the host publishes. */
export function VenueLiveOffers({ venueId = '', tableNumber = 'T-01', emptyState = null }: VenueLiveOffersProps) {
  const { offers, loading } = useLiveOffers(venueId);
  const [category, setCategory] = useState('all');
  const [open, setOpen] = useState<VenueLiveOffer | null>(null);
  const shown = useMemo(() => (category === 'all' ? offers : offers.filter((o) => o.category === category)), [offers, category]);

  if (!loading && offers.length === 0) return <>{emptyState}</>;

  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8a6d3f]">
            <Sparkles className="h-3 w-3" aria-hidden /> Live venue specials
          </p>
          <h2 className="mt-2 text-[2rem] font-light leading-[1.05] text-[#10231a] sm:text-[2.4rem]" style={LUXE_SERIF}>Exclusive offers &amp; <em className="font-normal text-[#8a6d3f]">deals</em></h2>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#10231a]/60">Happy hours, complimentary perks and savings for dining and staying guests.</p>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map((c) => (
            <button key={c.key} type="button" aria-pressed={category === c.key} onClick={() => setCategory(c.key)}
              className={`h-9 shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-4 text-xs font-semibold transition-colors duration-300 active:scale-95 ${
                category === c.key ? 'border-[#0f2a1e] bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] text-[#f5f1e8]' : 'border-[#e8dfcc] bg-[#fbf9f4] text-[#10231a]/65 hover:border-[#d9c193] hover:text-[#10231a]'
              }`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading
          ? [1, 2, 3].map((n) => <div key={n} className="shimmer h-56 rounded-[26px]" />)
          : shown.map((o, i) => (
            <div key={`${category}-${o.id}`} className={s.riseIn} style={{ ['--i' as string]: i } as React.CSSProperties}>
              <LiveOfferCard offer={o} tableNumber={tableNumber} onClaim={setOpen} />
            </div>
          ))}
      </div>

      {open && <OfferActionSheet venueId={venueId} tableNumber={tableNumber} offer={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
