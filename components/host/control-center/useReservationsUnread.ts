'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePoll } from '@/lib/utils/use-poll';
import type { ReservationSummary } from '@/lib/services/reservations/reservation-summary.service';

const POLL_MS = 20_000;
const seenKey = (venueId: string) => `qc_reservations_seen_${venueId}`;

function readSeen(venueId: string): string {
  try {
    const v = localStorage.getItem(seenKey(venueId));
    if (v) return v;
    // The first visit counts from now, so a venue's whole history does not light up as new.
    const now = new Date().toISOString();
    localStorage.setItem(seenKey(venueId), now);
    return now;
  } catch {
    return new Date().toISOString();
  }
}

/**
 * New table bookings, room bookings, event guest-list joins and offer requests since the host last opened Reservations,
 * for the sidebar's glowing light. Opening the tab (`viewing`) marks everything seen.
 */
export function useReservationsUnread(venueId: string | undefined, viewing: boolean) {
  const [summary, setSummary] = useState<ReservationSummary | null>(null);
  const viewingRef = useRef(viewing);
  viewingRef.current = viewing;

  const load = useCallback(async () => {
    if (!venueId) return;
    if (viewingRef.current) { try { localStorage.setItem(seenKey(venueId), new Date().toISOString()); } catch { /* private mode */ } }
    try {
      const res = await fetch(`/api/host/reservations/summary?since=${encodeURIComponent(readSeen(venueId))}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.summary) setSummary(data.summary);
    } catch { /* the light is a hint; the tab still lists everything */ }
  }, [venueId]);

  useEffect(() => { void load(); }, [load, viewing]);
  usePoll(() => { void load(); }, POLL_MS);

  return { unread: viewing ? 0 : summary?.unread ?? 0, waiting: summary?.waiting ?? 0, summary };
}
