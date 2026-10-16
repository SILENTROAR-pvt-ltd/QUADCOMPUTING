'use client';

import React, { useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { VenueLiveOffer } from '@/types/offers';
import { OfferActionSheet } from '@/components/guest/offers/OfferActionSheet';
import { useLiveOffers } from './offers/useLiveOffers';
import { LiveOfferCard } from './offers/LiveOfferCard';

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
    <section className="animate-in fade-in space-y-4 duration-300">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900">
            <Sparkles className="h-3 w-3 animate-pulse fill-amber-500 text-amber-600" /> Live Venue Specials
          </span>
          <h2 className="mt-1 font-serif text-2xl font-medium tracking-tight text-neutral-900 sm:text-3xl">Exclusive Offers &amp; Deals</h2>
          <p className="mt-0.5 text-xs font-light text-neutral-500 sm:text-sm">Active happy hours, complimentary perks &amp; discounts for dining and staying guests.</p>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map((c) => (
            <button key={c.key} type="button" aria-pressed={category === c.key} onClick={() => setCategory(c.key)}
              className={`h-9 shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-3.5 text-xs font-semibold transition-colors active:scale-95 ${
                category === c.key ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200/90 bg-white text-neutral-600 hover:border-neutral-300 hover:text-neutral-900'
              }`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading
          ? [1, 2, 3].map((n) => <div key={n} className="shimmer h-48 rounded-3xl" />)
          : shown.map((o) => <LiveOfferCard key={o.id} offer={o} tableNumber={tableNumber} onClaim={setOpen} />)}
      </div>

      {open && <OfferActionSheet venueId={venueId} tableNumber={tableNumber} offer={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
