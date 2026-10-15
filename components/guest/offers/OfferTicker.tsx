'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { VenueLiveOffer } from '@/types/offers';
import { createClient } from '@/lib/supabase/client';
import { isOfferLive } from '@/lib/guest/offer-requests-client';
import { apiRequest } from '@/lib/utils/api-client';
import { OfferActionSheet } from './OfferActionSheet';

interface OfferTickerProps {
  venueId: string;
  tableNumber: string;
}

const REFRESH_MS = 30_000;
/** Up to this many offers sit still, side by side. More than this, and they drift from right to left. */
export const STILL_OFFERS_MAX = 3;
const SECONDS_PER_OFFER = 6;

/** One offer as a small rectangular tile: the saving in serif type, the offer's name beneath, and an arrow. */
export function OfferTile({ offer, onOpen, className = '' }: { offer: VenueLiveOffer; onOpen: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${offer.discount_badge}: ${offer.title}. Open offer`}
      className={`group relative flex h-[68px] flex-col justify-between overflow-hidden rounded-xl border border-[#d9d0f2] bg-gradient-to-br from-[#f6f2ff] via-[#efe9fd] to-[#e7defa] px-3 py-2 text-left shadow-[0_8px_22px_-10px_rgba(139,112,214,0.55),inset_0_1px_0_rgba(255,255,255,0.85)] transition-all duration-200 hover:border-[#b9a8ec] hover:shadow-[0_10px_26px_-10px_rgba(139,112,214,0.7),inset_0_1px_0_rgba(255,255,255,0.9)] active:scale-[0.97] cursor-pointer ${className}`}
    >
      {/* A soft glow in the corner, the lavender light behind the tile. */}
      <span aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(196,176,245,0.75),rgba(196,176,245,0)_70%)]" />
      <span className="relative line-clamp-2 pr-5 font-sans text-[12.5px] font-bold uppercase leading-[1.15] tracking-[0.02em] text-[#2e2358] antialiased">
        {offer.discount_badge}
      </span>
      <span className="relative truncate font-sans text-[11px] font-medium capitalize leading-none text-[#6b5f94] antialiased">{offer.title.toLowerCase()}</span>
      <span aria-hidden className="absolute right-2 top-2 grid h-4 w-4 place-items-center rounded-full bg-[#4a3a8c] text-white transition-transform duration-200 group-hover:translate-x-0.5">
        <ArrowRight className="h-2.5 w-2.5" />
      </span>
    </button>
  );
}

/**
 * Live offers above the menu, as small rectangular tiles that take little room, so the dishes stay close to the top. Up to three
 * sit side by side; more than that and the row drifts gently from right to left (it stops while a finger or the pointer is on
 * it, and for guests who prefer less motion it becomes a row they can swipe). Tap an offer to act on it.
 */
export function OfferTicker({ venueId, tableNumber }: OfferTickerProps) {
  const [offers, setOffers] = useState<VenueLiveOffer[]>([]);
  const [open, setOpen] = useState<VenueLiveOffer | null>(null);

  const load = useCallback(async () => {
    if (!venueId) return;
    const result = await apiRequest<{ offers: VenueLiveOffer[] }>(
      `/api/venue/offers?venue_id=${encodeURIComponent(venueId)}&active_only=true`,
      { cache: 'no-store' }
    );
    if (result.ok && result.data) setOffers(result.data.offers.filter((o) => isOfferLive(o)));
  }, [venueId]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, REFRESH_MS);

    // A host publishing or pulling an offer shows up here without a reload.
    const supabase = createClient();
    const channel = supabase
      ? supabase
          .channel(`menu_offers_${venueId}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'venue_live_offers', filter: `venue_id=eq.${venueId}` }, () => void load())
          .subscribe()
      : null;

    return () => {
      clearInterval(timer);
      if (supabase && channel) supabase.removeChannel(channel);
    };
  }, [venueId, load]);

  // Two copies of the list, so the row loops without a visible jump.
  const loop = useMemo(() => [...offers, ...offers], [offers]);
  if (offers.length === 0) return null;

  const drifting = offers.length > STILL_OFFERS_MAX;

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
            <div
              className="flex w-max animate-offers-rtl group-hover:[animation-play-state:paused] group-active:[animation-play-state:paused] motion-reduce:animate-none"
              style={{ animationDuration: `${Math.max(16, offers.length * SECONDS_PER_OFFER)}s` }}
            >
              {loop.map((o, i) => (
                <OfferTile key={`${o.id}-${i}`} offer={o} onOpen={() => setOpen(o)} className="mr-2 w-[148px] shrink-0 sm:w-[170px]" />
              ))}
            </div>
          </div>
        ) : (
          <div className={`grid gap-2 ${offers.length === 1 ? 'mx-auto max-w-[230px] grid-cols-1' : offers.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {offers.map((o) => (
              <OfferTile key={o.id} offer={o} onOpen={() => setOpen(o)} className="min-w-0" />
            ))}
          </div>
        )}
      </section>

      {open && (
        <OfferActionSheet venueId={venueId} tableNumber={tableNumber} offer={open} onClose={() => setOpen(null)} />
      )}
    </>
  );
}

export default OfferTicker;
