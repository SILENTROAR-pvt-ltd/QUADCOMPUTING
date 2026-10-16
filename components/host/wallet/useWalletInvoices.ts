'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '@/lib/utils/api-client';
import { usePoll } from '@/lib/utils/use-poll';
import type { InvoiceRow } from '@/lib/services/wallet/invoice-history.util';
import type { InvoiceSummary } from '@/lib/services/wallet/invoice-history.service';

const PAGE = 25;

/** The venue's settled bills with their fees: the first page and totals, then more pages on request. */
export function useWalletInvoices(venueId: string) {
  const [summary, setSummary] = useState<InvoiceSummary | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Pages already appended by "Load more" must survive a refresh of the first page.
  const extra = useRef(0);

  const loadFirst = useCallback(async () => {
    const res = await apiRequest<any>(`/api/host/wallet/invoices?limit=${PAGE}`, { cache: 'no-store' });
    if (res.ok && res.data?.success) {
      setSummary(res.data.summary ?? null);
      if (extra.current === 0) { setInvoices(res.data.invoices ?? []); setNextCursor(res.data.nextCursor ?? null); }
      setError(null);
    } else {
      setError(res.data?.error || 'Invoices could not be loaded.');
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    void loadFirst();
    const onRefresh = () => { extra.current = 0; void loadFirst(); };
    window.addEventListener('wallet:refresh', onRefresh);
    return () => window.removeEventListener('wallet:refresh', onRefresh);
  }, [loadFirst, venueId]);
  usePoll(() => { void loadFirst(); }, 30_000);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const res = await apiRequest<any>(`/api/host/wallet/invoices?limit=${PAGE}&cursor=${encodeURIComponent(nextCursor)}`, { cache: 'no-store' });
    if (res.ok && res.data?.success) {
      extra.current += 1;
      setInvoices((list) => [...list, ...(res.data.invoices ?? [])]);
      setNextCursor(res.data.nextCursor ?? null);
      setError(null);
    } else {
      setError(res.data?.error || 'More invoices could not be loaded.');
    }
    setLoadingMore(false);
  };

  return { summary, invoices, loaded, loadingMore, hasMore: nextCursor !== null, loadMore, error, retry: loadFirst };
}
