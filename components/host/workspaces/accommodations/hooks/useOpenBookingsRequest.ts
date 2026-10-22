'use client';

import { useEffect, useRef } from 'react';
import { OPEN_BOOKINGS_EVENT, takeOpenBookingsRequest } from '@/lib/host/open-room-request';

/**
 * The bell's "new room reservation" opens the bookings list. The request may come before this workspace is mounted
 * (the host taps the bell on another tab), so one waiting request is taken on mount, and later ones as they come.
 */
export function useOpenBookingsRequest(open: () => void) {
  const latest = useRef(open);
  latest.current = open;
  useEffect(() => {
    if (takeOpenBookingsRequest()) latest.current();
    const onOpen = () => { takeOpenBookingsRequest(); latest.current(); };
    window.addEventListener(OPEN_BOOKINGS_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_BOOKINGS_EVENT, onOpen);
  }, []);
}
