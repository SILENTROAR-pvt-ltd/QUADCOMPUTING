'use client';

import { useCallback, useEffect, useState } from 'react';
import { clubFetch } from '../api';
import { nearestPlace } from '@/lib/club/social/place-coords';

const KEY = 'vc_club_near';
const MAX_AGE_MS = 12 * 3600_000;

/** The destination the member was last found near. Only its name is kept, never the position. */
export function readNear(): string | null {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null') as { name?: string; at?: number } | null;
    return saved?.name && saved.at && Date.now() - saved.at < MAX_AGE_MS ? saved.name : null;
  } catch { return null; }
}
const writeNear = (name: string | null) => {
  try { if (name) localStorage.setItem(KEY, JSON.stringify({ name, at: Date.now() })); else localStorage.removeItem(KEY); } catch { /* storage can be blocked */ }
};

/**
 * Where the member really is. On a tap it asks the browser for a position (never automatically), finds the
 * nearest listed destination on the device, and remembers that destination's name for twelve hours. The
 * position itself is not sent anywhere.
 */
export function useNearPlace() {
  const [near, setNear] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setNear(readNear()); }, []);

  const locate = useCallback(async () => {
    setError('');
    if (!navigator.geolocation) return setError('This browser cannot share your location. Pick a place instead.');
    setBusy(true);
    const pos = await new Promise<GeolocationPosition | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 10_000, maximumAge: 600_000 });
    });
    if (!pos) { setBusy(false); return setError('Could not get your location. Allow it in the browser, or pick a place instead.'); }
    const res = await clubFetch<{ places: Array<{ slug: string; name: string }> }>('/places?sort=name');
    setBusy(false);
    if (!res.ok) return setError(res.error);
    const hit = nearestPlace(pos.coords.latitude, pos.coords.longitude, res.data.places);
    if (!hit) return setError('You are not near a listed destination yet. Pick a place instead.');
    writeNear(hit.place.name);
    setNear(hit.place.name);
  }, []);

  const clear = useCallback(() => { writeNear(null); setNear(null); setError(''); }, []);
  return { near, locate, clear, busy, error };
}
