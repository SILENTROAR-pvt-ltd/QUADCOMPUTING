'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { walletAuthHeaders } from '@/lib/utils/wallet-secret';
import type { GuestInvoice, InvoiceResult, VenueInvoiceStats } from '@/lib/services/guest-auth/guest-bills.service';

export interface InvoiceFiltersUi {
  venueId: string;  // '' = all venues
  payment: 'ALL' | 'UPI' | 'CASH' | 'CARD' | 'SPLIT' | 'WALLET';
  from: string;     // YYYY-MM-DD or ''
  to: string;       // YYYY-MM-DD or ''
}

export const EMPTY_INVOICE_FILTERS: InvoiceFiltersUi = { venueId: '', payment: 'ALL', from: '', to: '' };

function queryString(filters: InvoiceFiltersUi, extra: Record<string, string>) {
  const p = new URLSearchParams();
  if (filters.venueId) p.set('venue_id', filters.venueId);
  if (filters.payment !== 'ALL') p.set('payment', filters.payment);
  if (filters.from) p.set('from', filters.from);
  if (filters.to) p.set('to', filters.to);
  for (const [k, v] of Object.entries(extra)) p.set(k, v);
  return p.toString();
}

/** One bill, by id, if it is the guest's. Used by the wallet ledger's "Invoice" link. */
export async function fetchInvoiceById(handle: string, orderId: string): Promise<GuestInvoice | null> {
  const qs = new URLSearchParams({ handle, order_id: orderId, limit: '1' }).toString();
  const res = await fetch(`/api/guest/invoices?${qs}`, { headers: walletAuthHeaders(), cache: 'no-store' });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) throw new Error(data?.error || 'The invoice could not be loaded.');
  return (data as InvoiceResult).invoices[0] ?? null;
}

export function useGuestInvoices(handle: string | null, filters: InvoiceFiltersUi) {
  const [invoices, setInvoices] = useState<GuestInvoice[]>([]);
  const [venues, setVenues] = useState<VenueInvoiceStats[]>([]);
  const [summary, setSummary] = useState<InvoiceResult['summary'] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const filtersKey = JSON.stringify(filters);

  const fetchPage = useCallback(async (before: string | null, append: boolean) => {
    if (!handle) return;
    const id = ++requestRef.current;
    if (append) setLoadingMore(true); else setLoading(true);
    setError(null);
    try {
      const qs = queryString(JSON.parse(filtersKey) as InvoiceFiltersUi, { handle, limit: '20', ...(before ? { before } : {}) });
      const res = await fetch(`/api/guest/invoices?${qs}`, { headers: walletAuthHeaders(), cache: 'no-store' });
      const data = await res.json();
      if (id !== requestRef.current) return;
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not load your bills.');
      const result = data as InvoiceResult;
      setInvoices((prev) => (append ? [...prev, ...result.invoices] : result.invoices));
      setVenues(result.venues);
      setSummary(result.summary);
      setHasMore(result.has_more);
      setNextBefore(result.next_before);
    } catch (e: any) {
      if (id === requestRef.current) setError(e?.message || 'Could not load your bills.');
    } finally {
      if (id === requestRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [handle, filtersKey]);

  useEffect(() => {
    if (!handle) {
      setInvoices([]); setVenues([]); setSummary(null); setHasMore(false);
      return;
    }
    void fetchPage(null, false);
    const refresh = () => void fetchPage(null, false);
    window.addEventListener('guest-wallet:refresh', refresh);
    return () => window.removeEventListener('guest-wallet:refresh', refresh);
  }, [handle, filtersKey, fetchPage]);

  const loadMore = useCallback(() => {
    if (hasMore && nextBefore && !loadingMore) void fetchPage(nextBefore, true);
  }, [hasMore, nextBefore, loadingMore, fetchPage]);

  const downloadCsv = useCallback(async () => {
    if (!handle) return;
    const qs = queryString(JSON.parse(filtersKey) as InvoiceFiltersUi, { handle, format: 'csv' });
    const res = await fetch(`/api/guest/invoices?${qs}`, { headers: walletAuthHeaders(), cache: 'no-store' });
    if (!res.ok) throw new Error('The export could not be prepared. Please try again.');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bills-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [handle, filtersKey]);

  return { invoices, venues, summary, hasMore, loading, loadingMore, error, loadMore, downloadCsv, retry: () => void fetchPage(null, false) };
}
