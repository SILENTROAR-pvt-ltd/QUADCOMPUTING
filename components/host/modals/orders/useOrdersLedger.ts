'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { LedgerOrder } from '@/lib/services/analytics/orders-ledger.util';

export type LedgerPeriod = 'daily' | 'weekly' | 'monthly' | 'custom';

interface LedgerState {
  orders: LedgerOrder[];
  start: string | null;
  end: string | null;
  truncated: boolean;
}

const EMPTY: LedgerState = { orders: [], start: null, end: null, truncated: false };

/** Bills for a dashboard period, from the same date range the dashboard figures use. */
export function useOrdersLedger(period: LedgerPeriod, range: { start: string; end: string } | null, venueId?: string) {
  const [state, setState] = useState<LedgerState>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ range: period });
      if (period === 'custom' && range) { params.set('startDate', range.start); params.set('endDate', range.end); }
      if (venueId) params.set('business_id', venueId);
      const res = await fetch(`/api/host/analytics/orders?${params.toString()}`, { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (id !== requestId.current) return;
      if (!res.ok) throw new Error(json?.error || 'The bills could not be loaded.');
      setState({ orders: json.orders || [], start: json.start_date, end: json.end_date, truncated: Boolean(json.truncated) });
    } catch (e: any) {
      if (id === requestId.current) setError(e?.message || 'The bills could not be loaded.');
    } finally {
      if (id === requestId.current) setIsLoading(false);
    }
  }, [period, range, venueId]);

  useEffect(() => { void load(); }, [load]);

  return { ...state, isLoading, error, reload: load };
}
