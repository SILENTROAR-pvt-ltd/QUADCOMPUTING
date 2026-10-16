'use client';

import { useCallback, useEffect, useState } from 'react';
import type { VenueLiveOffer } from '@/types/offers';
import { createClient } from '@/lib/supabase/client';
import { isOfferLive } from '@/lib/guest/offer-requests-client';
import { apiRequest } from '@/lib/utils/api-client';

const REFRESH_MS = 30_000;

/** The offers that are live right now: read on a slow clock (while the tab is visible), and again the moment the host changes one. */
export function useTickerOffers(venueId: string): VenueLiveOffer[] {
  const [offers, setOffers] = useState<VenueLiveOffer[]>([]);

  const load = useCallback(async () => {
    if (!venueId) return;
    const result = await apiRequest<{ offers: VenueLiveOffer[] }>(`/api/venue/offers?venue_id=${encodeURIComponent(venueId)}&active_only=true`, { cache: 'no-store' });
    if (result.ok && result.data) setOffers(result.data.offers.filter((o) => isOfferLive(o)));
  }, [venueId]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, REFRESH_MS);
    const supabase = createClient();
    const channel = supabase
      .channel(`menu_offers_${venueId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'venue_live_offers', filter: `venue_id=eq.${venueId}` }, () => void load())
      .subscribe();
    return () => { clearInterval(timer); void supabase.removeChannel(channel); };
  }, [venueId, load]);

  return offers;
}
