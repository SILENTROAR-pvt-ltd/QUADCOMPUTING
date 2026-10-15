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
const SECONDS_PER_OFFER = 7;
const SERIF = { fontFamily: "'Playfair Display', Georgia, serif" } as const;

/** One offer as a square card: the saving in large type, the offer's name beneath, and a quiet way in. */
function OfferCard({ offer, onOpen, className = '' }: { offer: VenueLiveOffer; onOpen: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${offer.discount_badge}: ${offer.title}. Open offer`}
      className={`group flex flex-col rounded-2xl border border-zinc-200 bg-white p-3.5 text-left shadow-[0_8px_20px_-16px_rgba(10,50,34,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#0A3222]/35 active:scale-[0.98] cursor-pointer ${className}`}
    >
      <span className="line-clamp-2 text-[17px] font-semibold uppercase leading-[1.1] tracking-tight text-[#0A3222] sm:text-[18px]" style={SERIF}>
        {offer.discount_badge}
      </span>
      <span className="mt-1.5 line-clamp-2 text-[11.5px] font-medium capitalize leading-snug text-zinc-600">{offer.title.toLowerCase()}</span>
      <span className="mt-auto flex items-center justify-between border-t border-zinc-100 pt-2.5">
        <span className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-zinc-500">View offer</span>
        <span className="grid h-5 w-5 place-items-center rounded-full bg-[#0A3222] text-white transition-transform duration-300 group-hover:translate-x-0.5">
          <ArrowRight className="h-3 w-3" aria-hidden />
        </span>
      </span>
    </button>
  );
}
/**
 * Live offers above the menu, as square cards. Up to three sit side by side; more than that and the row drifts gently from
 * right to left (it stops while a finger or the pointer is on it, and for guests who prefer less motion it becomes a row
 * they can swipe). Tap an offer to act on it.
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
        <div className="mb-2.5 flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <span aria-hidden className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.26em] text-zinc-500">Live offers</h2>
          </div>
          <span className="text-[10px] font-medium tracking-wide text-zinc-400">{offers.length} {offers.length === 1 ? 'offer' : 'offers'} today</span>
        </div>

        {drifting ? (
          // The row stops under a finger or the pointer. With reduced motion it does not move: it scrolls by hand instead.
          <div className="group relative overflow-hidden motion-reduce:overflow-x-auto motion-reduce:[scrollbar-width:none]">
            <div
              className="flex w-max animate-offers-rtl group-hover:[animation-play-state:paused] group-active:[animation-play-state:paused] motion-reduce:animate-none"
              style={{ animationDuration: `${Math.max(18, offers.length * SECONDS_PER_OFFER)}s` }}
            >
              {loop.map((o, i) => (
                <OfferCard key={`${o.id}-${i}`} offer={o} onOpen={() => setOpen(o)} className="mr-3 h-[142px] w-[142px] shrink-0 sm:h-[154px] sm:w-[154px]" />
              ))}
            </div>
          </div>
        ) : (
          <div className={`grid gap-2.5 sm:gap-3 ${offers.length === 1 ? 'grid-cols-1' : offers.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {offers.map((o) => (
              <OfferCard key={o.id} offer={o} onOpen={() => setOpen(o)} className={offers.length === 1 ? 'min-h-[112px]' : 'aspect-square sm:aspect-[1/0.86]'} />
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
