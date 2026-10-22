'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePoll } from '@/lib/utils/use-poll';
import type { MyEventStatus } from '@/lib/services/live-events/my-event-status';

const POLL_MS = 30_000;
const storeKey = (venueId: string) => `qc_event_requests_${venueId}`;

/** The request ids this phone has sent to this venue, by event id. */
function readIds(venueId: string): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(storeKey(venueId)) || '{}') || {}; } catch { return {}; }
}

/** Remembers a request this phone sent, so the venue's answer can be shown on it later. */
export function rememberEventRequest(venueId: string, eventId: string, leadId: string | null | undefined) {
  if (!venueId || !eventId || !leadId) return;
  try {
    const ids = readIds(venueId);
    ids[eventId] = leadId;
    localStorage.setItem(storeKey(venueId), JSON.stringify(ids));
  } catch { /* private mode: a signed-in guest still sees their answers */ }
}

/**
 * The guest's own requests to join events and the venue's answer to each, read again every half minute while the page
 * is open, so "You're going" appears soon after the host confirms.
 */
export function useMyEventStatus(venueId: string) {
  const [statuses, setStatuses] = useState<Record<string, MyEventStatus>>({});

  const load = useCallback(async () => {
    if (!venueId) return;
    const ids = Object.values(readIds(venueId)).join(',');
    try {
      const res = await fetch(`/api/guest/events/mine?venue_id=${encodeURIComponent(venueId)}&ids=${encodeURIComponent(ids)}`, { cache: 'no-store' });
      const json = res.ok ? await res.json() : null;
      if (json?.statuses) setStatuses(json.statuses);
    } catch { /* the cards still show the events; the badge waits for the next read */ }
  }, [venueId]);

  useEffect(() => { void load(); }, [load]);
  usePoll(() => { void load(); }, POLL_MS);

  return { statuses, reload: load };
}
