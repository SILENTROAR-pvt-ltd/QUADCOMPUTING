'use client';

import { useEffect, useState } from 'react';

export interface VenueStatus {
  isOpen: boolean;
  opensAt: string | null;
  closesAt: string | null;
  reservationsEnabled: boolean;
}

/** Whether the venue is open right now and whether it takes bookings. Refreshed when the guest returns to the tab. */
export function useVenueStatus(venueId: string) {
  const [status, setStatus] = useState<VenueStatus | null>(null);

  useEffect(() => {
    if (!venueId) return;
    let cancelled = false;
    const load = () => {
      fetch(`/api/guest/venue-status?cafe_id=${encodeURIComponent(venueId)}`, { cache: 'no-store' })
        .then((r) => r.json())
        .then((j) => { if (!cancelled && j?.status) setStatus(j.status); })
        .catch(() => {});
    };
    load();
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { cancelled = true; document.removeEventListener('visibilitychange', onVisible); };
  }, [venueId]);

  return status;
}
