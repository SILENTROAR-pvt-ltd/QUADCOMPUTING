'use client';

import React, { useEffect, useState } from 'react';
import type { VenueLiveOffer } from '@/types/offers';
import { isOfferLive } from '@/lib/guest/offer-requests-client';
import { sharedGet } from '@/lib/utils/shared-get';
import { OfferActionSheet } from '@/components/guest/offers/OfferActionSheet';
import { OfferTile } from '@/components/guest/offers/OfferTicker';

// Stay deals apply to a room, not to a food order, so they are not listed in the order review.
const ORDER_CATEGORIES = ['food', 'general'];

interface CartOffersProps {
  venueId: string;
  tableNumber: string;
  /** From useOrderOffers, loaded with the menu so the review opens with them already in place. */
  offers: VenueLiveOffer[];
}

/** The venue's live offers that apply to a food order. Call it where it stays mounted, so the list is ready early. */
export function useOrderOffers(venueId: string): VenueLiveOffer[] {
  const [offers, setOffers] = useState<VenueLiveOffer[]>([]);
  useEffect(() => {
    if (!venueId) return;
    let live = true;
    // The same read the offers ticker makes at the same moment: one request serves both.
    sharedGet<{ offers: VenueLiveOffer[] }>(`/api/venue/offers?venue_id=${encodeURIComponent(venueId)}&active_only=true`)
      .then((result) => {
        if (!live || !result.ok || !result.data) return;
        setOffers(result.data.offers.filter((o) => isOfferLive(o) && ORDER_CATEGORIES.includes(o.category)));
      });
    return () => { live = false; };
  }, [venueId]);
  return offers;
}

/** Live venue offers that apply to this order, shown in the review before it goes to the kitchen. */
export function CartOffers({ venueId, tableNumber, offers }: CartOffersProps) {
  const [open, setOpen] = useState<VenueLiveOffer | null>(null);

  if (offers.length === 0) return null;

  return (
    <div className="space-y-2 border-t border-zinc-100 pt-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Venue offers</span>
        <span className="text-[10px] font-medium text-[#4a3a8c]">Live now</span>
      </div>
      {/* Small rectangular tiles, the same as on the menu: two across, each opens its offer. */}
      <ul className={`grid gap-2 ${offers.length === 1 ? 'mx-auto max-w-[230px] grid-cols-1' : 'grid-cols-2'}`}>
        {offers.map((o) => (
          <li key={o.id} className="min-w-0">
            <OfferTile offer={o} onOpen={() => setOpen(o)} className="w-full" />
          </li>
        ))}
      </ul>      {open && (
        <OfferActionSheet venueId={venueId} tableNumber={tableNumber} offer={open} onClose={() => setOpen(null)} />
      )}
    </div>
  );
}

export default CartOffers;
