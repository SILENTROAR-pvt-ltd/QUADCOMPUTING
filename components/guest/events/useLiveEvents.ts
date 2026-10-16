'use client';

import { useCallback, useEffect, useState } from 'react';
import type { GuestEvent } from './event-format';

/** The venue's live and upcoming events. Read once and again on demand; they change a few times a week, not a second. */
export function useLiveEvents(venueId: string) {
  const [events, setEvents] = useState<GuestEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (manual = false) => {
    if (!venueId) { setLoading(false); return; }
    if (manual) setRefreshing(true);
    try {
      const res = await fetch(`/api/guest/events?venue_id=${encodeURIComponent(venueId)}`, { cache: manual ? 'no-store' : 'default' });
      const json = res.ok ? await res.json() : null;
      setEvents(Array.isArray(json?.events) ? json.events : []);
    } catch {
      // A venue with no events (or a dropped connection) shows the empty state.
    }
    setLoading(false);
    setRefreshing(false);
  }, [venueId]);

  useEffect(() => { void load(); }, [load]);
  return { events, loading, refreshing, refresh: () => load(true) };
}
