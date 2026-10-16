'use client';

import { useCallback, useEffect, useState } from 'react';
import type { VenueLiveOffer } from '@/types/offers';
import { createClient } from '@/lib/supabase/client';

/** The venue's live offers, kept in step: read once, then again whenever the venue changes one. */
export function useLiveOffers(venueId: string) {
  const [offers, setOffers] = useState<VenueLiveOffer[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/venue/offers?venue_id=${encodeURIComponent(venueId)}&active_only=true`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.offers)) setOffers(json.offers);
      }
    } catch {
      // The offers are a courtesy: an unreachable list is shown as none.
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    void load();
    const supabase = createClient();
    const channel = supabase
      .channel(`venue_live_offers_${venueId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'venue_live_offers', filter: `venue_id=eq.${venueId}` }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [venueId, load]);

  return { offers, loading };
}
