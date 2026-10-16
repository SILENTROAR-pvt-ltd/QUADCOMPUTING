'use client';

import { useState } from 'react';

export type LocationStatus = 'idle' | 'locating' | 'ok' | 'error';

/** The guest's own position, asked for once when they tap "Use my location". Delivery range is checked from it. */
export function useGuestLocation() {
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const locate = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('error');
      setError('This browser cannot share your location. Try another browser, or order at the table.');
      return;
    }
    setStatus('locating'); setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus('ok');
      },
      () => {
        setPoint(null);
        setStatus('error');
        setError('We need your location to check the delivery range. Allow location for this site and try again.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60_000 },
    );
  };

  return { point, status, error, locate };
}
