'use client';

import React, { useMemo, useState } from 'react';
import type { VenueLiveOffer } from '@/types/offers';
import { OfferActionSheet } from './OfferActionSheet';
import { OfferTile } from './OfferTile';
import { useTickerOffers } from './useTickerOffers';

export { OfferTile } from './OfferTile';

interface OfferTickerProps {
  venueId: string;
  tableNumber: string;
}

/** Up to this many offers sit still, side by side. More than this, and they drift from right to left. */
export const STILL_OFFERS_MAX = 3;
const SECONDS_PER_OFFER = 6;

/**
 * Live offers above the menu, as small rectangular tiles that take little room, so the dishes stay close to the top. Up to
 * three sit side by side; more than that and the row drifts gently from right to left (it stops while a finger or the pointer
 * is on it, and for guests who prefer less motion it becomes a row they can swipe). Tap an offer to act on it.
 */
export function OfferTicker({ venueId, tableNumber }: OfferTickerProps) {
  const offers = useTickerOffers(venueId);
  const [open, setOpen] = useState<VenueLiveOffer | null>(null);
  // Two copies of the list, so the row loops without a visible jump.
  const loop = useMemo(() => [...offers, ...offers], [offers]);
  if (offers.length === 0) return null;

  const drifting = offers.length > STILL_OFFERS_MAX;
  const cols = offers.length === 1 ? 'mx-auto max-w-[230px] grid-cols-1' : offers.length === 2 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <>
      <section aria-label="Live venue offers" className="relative z-20 w-full">
        <div className="mb-1.5 flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <span aria-hidden className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.26em] text-zinc-500">Live offers</h2>
          </div>
          <span className="text-[10px] font-medium tracking-wide text-zinc-400">{offers.length} today</span>
        </div>

        {drifting ? (
          // The row stops under a finger or the pointer. With reduced motion it does not move: it scrolls by hand instead.
          <div className="group relative overflow-hidden motion-reduce:overflow-x-auto motion-reduce:[scrollbar-width:none]">
            <div className="flex w-max animate-offers-rtl group-hover:[animation-play-state:paused] group-active:[animation-play-state:paused] motion-reduce:animate-none"
              style={{ animationDuration: `${Math.max(16, offers.length * SECONDS_PER_OFFER)}s` }}>
              {loop.map((o, i) => <OfferTile key={`${o.id}-${i}`} offer={o} onOpen={() => setOpen(o)} className="mr-2 w-[148px] shrink-0 sm:w-[170px]" />)}
            </div>
          </div>
        ) : (
          <div className={`grid gap-2 ${cols}`}>
            {offers.map((o) => <OfferTile key={o.id} offer={o} onOpen={() => setOpen(o)} className="min-w-0" />)}
          </div>
        )}
      </section>

      {open && <OfferActionSheet venueId={venueId} tableNumber={tableNumber} offer={open} onClose={() => setOpen(null)} />}
    </>
  );
}

export default OfferTicker;
