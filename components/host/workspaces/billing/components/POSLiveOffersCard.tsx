'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import type { VenueLiveOffer } from '@/types/offers';
import { createClient } from '@/lib/supabase/client';
import { isOfferLive } from '@/lib/guest/offer-requests-client';
import { apiRequest } from '@/lib/utils/api-client';
import { offerDiscount, type OfferDiscount } from '@/lib/services/offers/offer-discount';

interface POSLiveOffersCardProps {
  cafeId?: string | null;
  onApply: (discount: OfferDiscount) => void;
  onClear: () => void;
}

// Till refresh: short, because a bill is being taken while the offers change. Realtime is the fast path.
const REFRESH_MS = 10_000;

/** The venue's live offers at the till. Applying one fills the bill discount; the host can change or clear it. */
export function POSLiveOffersCard({ cafeId, onApply, onClear }: POSLiveOffersCardProps) {
  const [offers, setOffers] = useState<VenueLiveOffer[]>([]);
  const [appliedId, setAppliedId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!cafeId) return;
    const result = await apiRequest<{ offers: VenueLiveOffer[] }>(
      `/api/venue/offers?venue_id=${encodeURIComponent(cafeId)}&active_only=true`,
      { cache: 'no-store' }
    );
    if (result.ok && result.data) setOffers(result.data.offers.filter((o) => isOfferLive(o)));
  }, [cafeId]);

  // Offers published, paused or ended on another screen show up here without a reload.
  useEffect(() => {
    void load();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, REFRESH_MS);
    // Back on the till after time away: show what is live now, not what was live when the tab was left.
    const onVisible = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', onVisible);
    const supabase = createClient();
    const channel = supabase && cafeId
      ? supabase
          .channel(`pos_offers_${cafeId}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'venue_live_offers', filter: `venue_id=eq.${cafeId}` }, () => void load())
          .subscribe()
      : null;
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      if (supabase && channel) supabase.removeChannel(channel);
    };
  }, [cafeId, load]);

  const apply = (offer: VenueLiveOffer) => {
    const discount = offerDiscount(offer.discount_badge);
    setAppliedId(offer.id);
    if (discount) {
      setNote(null);
      onApply(discount);
    } else {
      // Nothing to compute from the badge: leave the amount to the host and say so.
      setNote(`"${offer.discount_badge}" has no amount. Enter the discount in the field below.`);
    }
  };

  const clear = () => {
    setAppliedId(null);
    setNote(null);
    onClear();
  };

  if (!cafeId || offers.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
          <Sparkles className="h-3.5 w-3.5 text-amber-600" /> Live offers
        </span>
        {appliedId && (
          <button type="button" onClick={clear} className="flex items-center gap-1 text-[11px] font-semibold text-zinc-600 hover:text-black cursor-pointer">
            <X className="h-3 w-3" /> Clear offer
          </button>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {offers.map((o) => {
          const on = appliedId === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => apply(o)}
              aria-pressed={on}
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                on ? 'border-black bg-black text-white' : 'border-amber-200 bg-amber-50/60 text-zinc-900 hover:bg-amber-50'
              }`}
            >
              <span className={`font-mono font-bold ${on ? 'text-amber-200' : 'text-amber-900'}`}>{o.discount_badge}</span>
              <span className="max-w-[12rem] truncate font-medium">{o.title}</span>
            </button>
          );
        })}
      </div>
      {note && <p role="status" className="text-[11px] text-amber-800">{note}</p>}
    </div>
  );
}

export default POSLiveOffersCard;
