'use client';

import { useCallback, useEffect, useState } from 'react';
import { writeJsonSeed } from '@/lib/guest/menu-seed';
import { useJsonSeed } from '@/lib/guest/use-client-seed';
import { addDays, todayIst, type StayType, type StayVenue } from './stay-format';

export interface ShowcaseRange { check_in: string; check_out: string; nights: number; error: string | null }
interface Showcase { venue: StayVenue; types: StayType[]; range: ShowcaseRange | null }

/** The showcase API's URL for a venue and dates, the same string the menu prefetches so the page can open from it. */
export const showcaseUrl = (venue: string, checkIn: string, checkOut: string) =>
  `/api/guest/stay/showcase?${new URLSearchParams({ venue, check_in: checkIn, check_out: checkOut })}`;

/** The public showcase for a venue, re-read when the dates change. Opens from a read made ahead of time when there is one. */
export function useStayShowcase(venueParam: string) {
  const [checkIn, setCheckIn] = useState(() => todayIst());
  const [checkOut, setCheckOut] = useState(() => addDays(todayIst(), 1));
  const seed = useJsonSeed<Showcase>(showcaseUrl(venueParam, checkIn, checkOut));
  const [fresh, setFresh] = useState<Showcase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const shown = fresh ?? seed;

  const load = useCallback(async () => {
    if (!venueParam) { setError('This link has no venue.'); setLoading(false); return; }
    setLoading(true);
    try {
      const url = showcaseUrl(venueParam, checkIn, checkOut);
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) { setError(data.error || 'This venue could not be found.'); return; }
      setFresh({ venue: data.venue, types: data.types || [], range: data.range || null });
      setError(null);
      writeJsonSeed(url, data);
    } catch {
      setError('Could not reach the venue. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [venueParam, checkIn, checkOut]);

  useEffect(() => { void load(); }, [load]);

  const setDates = (nextIn: string, nextOut: string) => {
    const today = todayIst();
    const a = nextIn < today ? today : nextIn;
    const b = nextOut <= a ? addDays(a, 1) : nextOut;
    setCheckIn(a);
    setCheckOut(b);
  };

  return { venue: shown?.venue || null, types: shown?.types || [], range: shown?.range || null, checkIn, checkOut, setDates, loading, error, reload: load };
}
