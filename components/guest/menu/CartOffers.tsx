'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { VenueLiveOffer } from '@/types/offers';
import { isOfferLive } from '@/lib/guest/offer-requests-client';
import { apiRequest } from '@/lib/utils/api-client';
import { OfferActionSheet } from '@/components/guest/offers/OfferActionSheet';

// Stay deals apply to a room, not to a food order, so they are not listed in the order review.
const ORDER_CATEGORIES = ['food', 'general'];

interface CartOffersProps {
  venueId: string;
  tableNumber: string;
}

/** Live venue offers that apply to this order, shown in the review before it goes to the kitchen. */
export function CartOffers({ venueId, tableNumber }: CartOffersProps) {
  const [offers, setOffers] = useState<VenueLiveOffer[]>([]);
  const [open, setOpen] = useState<VenueLiveOffer | null>(null);

  useEffect(() => {
    if (!venueId) return;
    let live = true;
    apiRequest<{ offers: VenueLiveOffer[] }>(`/api/venue/offers?venue_id=${encodeURIComponent(venueId)}&active_only=true`, { cache: 'no-store' })
      .then((result) => {
        if (!live || !result.ok || !result.data) return;
        setOffers(result.data.offers.filter((o) => isOfferLive(o) && ORDER_CATEGORIES.includes(o.category)));
      });
    return () => { live = false; };
  }, [venueId]);

  if (offers.length === 0) return null;

  return (
    <div className="space-y-2 border-t border-zinc-100 pt-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Venue offers</span>
        <span className="text-[10px] font-medium text-amber-700">Live now</span>
      </div>
      <ul className="space-y-2">
        {offers.map((o) => (
          <li key={o.id}>
            <button
              type="button"
              onClick={() => setOpen(o)}
              className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/60 px-3.5 py-2.5 text-left transition-colors hover:bg-amber-50"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                <span className="truncate text-xs font-semibold text-neutral-900">{o.title}</span>
              </span>
              <span className="shrink-0 font-mono text-[11px] font-bold text-amber-900">{o.discount_badge}</span>
            </button>
          </li>
        ))}
      </ul>
      {open && (
        <OfferActionSheet venueId={venueId} tableNumber={tableNumber} offer={open} onClose={() => setOpen(null)} />
      )}
    </div>
  );
}

export default CartOffers;
