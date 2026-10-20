'use client';

import { useCallback, useEffect, useState } from 'react';
import { addDays, todayIst, type StayType, type StayVenue } from './stay-format';

export interface ShowcaseRange { check_in: string; check_out: string; nights: number; error: string | null }

/** The public showcase for a venue, re-read when the dates change. */
export function useStayShowcase(venueParam: string) {
  const [venue, setVenue] = useState<StayVenue | null>(null);
  const [types, setTypes] = useState<StayType[]>([]);
  const [range, setRange] = useState<ShowcaseRange | null>(null);
  const [checkIn, setCheckIn] = useState(() => todayIst());
  const [checkOut, setCheckOut] = useState(() => addDays(todayIst(), 1));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!venueParam) { setError('This link has no venue.'); setLoading(false); return; }
    setLoading(true);
    try {
      const q = new URLSearchParams({ venue: venueParam, check_in: checkIn, check_out: checkOut });
      const res = await fetch(`/api/guest/stay/showcase?${q}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) { setError(data.error || 'This venue could not be found.'); return; }
      setVenue(data.venue);
      setTypes(data.types || []);
      setRange(data.range || null);
      setError(null);
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

  return { venue, types, range, checkIn, checkOut, setDates, loading, error, reload: load };
}
