'use client';

import { useCallback, useEffect, useState } from 'react';

const OPEN_TOUR_EVENT = 'quad:open-tour';
const doneKey = (venueId: string) => `qc_tour_done_${venueId}`;

/** Reopens the welcome tour from anywhere in the console (the sidebar's "Take the tour"). */
export const openWelcomeTour = () => window.dispatchEvent(new Event(OPEN_TOUR_EVENT));

/** True when this browser has just created this venue: sign-up leaves the provisioning result in the session. */
function justCreated(venueId: string): boolean {
  try {
    const p = JSON.parse(sessionStorage.getItem('quad-provisioning') || 'null');
    return p?.businessId === venueId || (Array.isArray(p?.businesses) && p.businesses.some((b: any) => b?.id === venueId));
  } catch {
    return false;
  }
}

/**
 * Whether the welcome tour is open. It opens by itself once, on the first visit after sign-up, and again whenever the
 * host asks for it. Skipping or finishing remembers it for this venue on this browser.
 */
export function useWelcomeTour(venueId: string) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!venueId) return;
    let seen = false;
    try { seen = Boolean(localStorage.getItem(doneKey(venueId))); } catch { /* private mode: show it once per visit */ }
    if (!seen && justCreated(venueId)) setOpen(true);
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_TOUR_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_TOUR_EVENT, onOpen);
  }, [venueId]);

  const close = useCallback(() => {
    setOpen(false);
    try { localStorage.setItem(doneKey(venueId), new Date().toISOString()); } catch { /* nothing to remember it in */ }
  }, [venueId]);

  return { open, close };
}
