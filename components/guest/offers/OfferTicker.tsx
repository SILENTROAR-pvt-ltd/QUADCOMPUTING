'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
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
const SECONDS_PER_OFFER = 6;

/** Live offers as a floating strip above the menu. It drifts from left to right; tap one to act on it. */
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

  // Two copies of the list, so the strip loops without a visible jump.
  const loop = useMemo(() => [...offers, ...offers], [offers]);
  if (offers.length === 0) return null;

  return (
    <>
      <div className="relative z-20 mx-auto mt-3 max-w-5xl px-4 sm:px-6">
        <div className="flex items-center gap-3 overflow-hidden rounded-full border border-amber-200/70 bg-white/85 py-2 pl-3 pr-2 shadow-[0_8px_30px_rgba(120,80,20,0.12)] backdrop-blur-xl">
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-950 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" /> Live
          </span>
          <div className="relative min-w-0 flex-1 overflow-hidden" aria-label="Live venue offers">
            <motion.div
              className="flex w-max items-center gap-6"
              initial={{ x: '-50%' }}
              animate={{ x: '0%' }}
              transition={{ duration: Math.max(12, offers.length * SECONDS_PER_OFFER), repeat: Infinity, ease: 'linear', repeatType: 'loop' }}
            >
              {loop.map((o, i) => (
                <button
                  key={`${o.id}-${i}`}
                  type="button"
                  onClick={() => setOpen(o)}
                  className="flex shrink-0 items-center gap-2 whitespace-nowrap text-xs text-neutral-800 cursor-pointer"
                >
                  <Sparkles className="h-3 w-3 text-amber-600" />
                  <span className="font-mono font-bold text-amber-900">{o.discount_badge}</span>
                  <span className="font-medium">{o.title}</span>
                </button>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      {open && (
        <OfferActionSheet venueId={venueId} tableNumber={tableNumber} offer={open} onClose={() => setOpen(null)} />
      )}
    </>
  );
}

export default OfferTicker;
