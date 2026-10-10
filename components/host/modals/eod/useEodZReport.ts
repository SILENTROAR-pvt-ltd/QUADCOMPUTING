'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { EodZReport } from '@/lib/services/analytics/eod-z-report.types';
import { businessDateString } from '@/lib/utils/business-day';

/** Moves a YYYY-MM-DD date by whole days. */
export function shiftDay(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The Z-report for one IST business day, today by default. */
export function useEodZReport(venueId?: string) {
  const today = businessDateString();
  const [date, setDate] = useState(today);
  const [data, setData] = useState<EodZReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ date });
      if (venueId) params.set('business_id', venueId);
      const res = await fetch(`/api/host/analytics/eod-z-report?${params.toString()}`, { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (id !== requestId.current) return;
      if (!res.ok) throw new Error(json?.error || `The report could not be loaded (${res.status}).`);
      setData(json as EodZReport);
    } catch (e: any) {
      if (id === requestId.current) { setData(null); setError(e?.message || 'The report could not be loaded.'); }
    } finally {
      if (id === requestId.current) setIsLoading(false);
    }
  }, [date, venueId]);

  useEffect(() => { void load(); }, [load]);

  const pick = (next: string) => { if (next && next <= today) setDate(next); };
  return { date, today, setDate: pick, data, isLoading, error, reload: load };
}
