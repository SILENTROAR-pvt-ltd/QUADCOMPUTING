'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/utils/api-client';
import { usePoll } from '@/lib/utils/use-poll';
import { currentBillingDay, shiftDay } from '@/lib/services/wallet/billing-day';
import type { DaySlip, FeeFilter, PaymentFilter, SlipTotals } from '@/lib/services/wallet/day-slips.util';

export type RangePreset = 'today' | 'yesterday' | '7d' | '30d' | 'all' | 'day';

export interface SlipQuery { preset: RangePreset; day: string; fee: FeeFilter; payment: PaymentFilter; q: string }

/** The date range a preset stands for, in billing days (10 AM to 10 PM, closing at 10 PM IST). */
export function rangeFor(query: SlipQuery, today: string): { from: string; to: string } | 'all' {
  switch (query.preset) {
    case 'today': return { from: today, to: today };
    case 'yesterday': { const y = shiftDay(today, -1); return { from: y, to: y }; }
    case '7d': return { from: shiftDay(today, -6), to: today };
    case '30d': return { from: shiftDay(today, -29), to: today };
    case 'day': return { from: query.day || today, to: query.day || today };
    default: return 'all';
  }
}

const EMPTY: SlipTotals = { bills: 0, revenue: 0, fees: 0, feesDue: 0, feesPaid: 0, afterHours: 0 };

/** Daily due slips for the chosen range and filters. Search waits for a short pause in typing. */
export function useDaySlips() {
  const today = currentBillingDay();
  const [query, setQuery] = useState<SlipQuery>({ preset: '7d', day: today, fee: 'all', payment: 'all', q: '' });
  const [search, setSearch] = useState('');
  const [days, setDays] = useState<DaySlip[]>([]);
  const [totals, setTotals] = useState<SlipTotals>(EMPTY);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQuery((q) => (q.q === search ? q : { ...q, q: search })), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    const range = rangeFor(query, currentBillingDay());
    const params = new URLSearchParams({ fee: query.fee, payment: query.payment });
    if (query.q.trim()) params.set('q', query.q.trim());
    if (range === 'all') params.set('all', '1'); else { params.set('from', range.from); params.set('to', range.to); }
    setLoading(true);
    const res = await apiRequest<any>(`/api/host/wallet/day-slips?${params}`, { cache: 'no-store' });
    if (res.ok && res.data?.success) {
      setDays(res.data.days ?? []); setTotals(res.data.totals ?? EMPTY); setTruncated(Boolean(res.data.truncated)); setError(null);
    } else {
      setError(res.data?.error || 'Due slips could not be loaded.');
    }
    setLoading(false);
  }, [query]);

  useEffect(() => {
    void load();
    const onRefresh = () => { void load(); };
    window.addEventListener('wallet:refresh', onRefresh);
    return () => window.removeEventListener('wallet:refresh', onRefresh);
  }, [load]);
  usePoll(() => { void load(); }, 60_000);

  const update = (patch: Partial<SlipQuery>) => setQuery((q) => ({ ...q, ...patch }));
  const reset = () => { setSearch(''); setQuery({ preset: '7d', day: today, fee: 'all', payment: 'all', q: '' }); };
  const filtered = query.fee !== 'all' || query.payment !== 'all' || query.q.trim() !== '' || query.preset !== '7d';

  return { query, update, search, setSearch, reset, filtered, days, totals, truncated, loading, error, retry: load, today };
}
