'use client';

import { useCallback, useEffect, useState } from 'react';
import { sharedGet } from '@/lib/utils/shared-get';
import { GUEST_ACCOUNT_EVENT } from '@/lib/guest/guest-account-client';
import { writeJsonSeed } from '@/lib/guest/menu-seed';
import { useJsonSeed } from '@/lib/guest/use-client-seed';
import type { GuestStay, MyRoom } from '@/lib/services/stay/stay-hub.service';

export interface StayHub {
  venue: { id: string; name: string; slug: string | null; self_checkin_enabled: boolean; in_room_dining_enabled: boolean; has_rooms: boolean; from_price: number | null; free_now: number };
  my_room: MyRoom | null;
  signed_in: boolean;
  stays: GuestStay[];
}

const hubUrl = (venueId: string, scope: 'venue' | 'all') => {
  const q = new URLSearchParams({ venue_id: venueId });
  if (scope === 'all') q.set('scope', 'all');
  return `/api/guest/stay/mine?${q}`;
};

/**
 * The guest's stays at this venue (or everywhere): their room now, their reservations, and what the venue offers.
 * Opens from the last answer this browser saw, so the Stay tab and tile are there on first paint, then re-reads; and
 * again when the guest signs in or out.
 */
export function useStayHub(venueId: string, scope: 'venue' | 'all' = 'venue') {
  const seed = useJsonSeed<StayHub>(venueId ? hubUrl(venueId, scope) : null);
  const [fresh, setFresh] = useState<StayHub | null>(null);
  const [loading, setLoading] = useState(true);
  const data = fresh ?? seed;

  const refresh = useCallback(async () => {
    if (!venueId) { setLoading(false); return; }
    const url = hubUrl(venueId, scope);
    const res = await sharedGet<StayHub & { success: boolean }>(url);
    if (res.ok && res.data?.success) { setFresh(res.data); writeJsonSeed(url, res.data); }
    setLoading(false);
  }, [venueId, scope]);

  useEffect(() => {
    void refresh();
    const onAccount = () => void refresh();
    window.addEventListener(GUEST_ACCOUNT_EVENT, onAccount);
    return () => window.removeEventListener(GUEST_ACCOUNT_EVENT, onAccount);
  }, [refresh]);

  return { data, loading: loading && !data, refresh };
}
