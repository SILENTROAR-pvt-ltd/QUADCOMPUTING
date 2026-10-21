'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/utils/api-client';

export type LedgerFilter = 'all' | 'repeat' | 'spenders' | 'recent';

export interface LedgerGuest {
  id: string; guest_name: string; vibers_handle: string | null; email: string | null; phone: string | null;
  visits: number; total_spend: number; event_leads: number; last_visit_at: string | null;
  /** Stays at the venue (from the stay log, by phone) and the nights they add up to. */
  stays?: number; nights?: number; last_stay_at?: string | null;
}
export interface LedgerMetrics { totalGuests: number; repeatVisitors: number; totalEventLeads: number; stayGuests?: number; nights?: number }

interface Response { metrics: LedgerMetrics; guests: LedgerGuest[]; highSpenderThreshold: number; recentDays: number }

/** The venue's guest ledger and its headline numbers; the table narrows by filter and search, the numbers do not. */
export function useGuestLedger(filter: LedgerFilter, search: string) {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const q = new URLSearchParams({ filter });
    if (search.trim()) q.set('q', search.trim());
    const r = await apiRequest<Response>(`/api/host/guests?${q}`, { cache: 'no-store' });
    if (r.ok && r.data) { setData(r.data); setError(null); } else setError(r.error || 'Could not load guests.');
    setLoading(false);
  }, [filter, search]);

  useEffect(() => {
    const t = setTimeout(() => void load(), search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  return { data, loading, error, reload: load };
}
