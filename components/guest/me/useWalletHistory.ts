'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { walletAuthHeaders } from '@/lib/utils/wallet-secret';
import type { HistoryResult, HistoryRow, HistoryVenue } from '@/lib/services/wallet/wallet-history.service';

export interface WalletHistoryFilters {
  venueId: string;   // '' = all venues
  type: 'ALL' | 'CASHBACK' | 'REDEMPTION' | 'ADJUSTMENT';
  from: string;      // YYYY-MM-DD or ''
  to: string;        // YYYY-MM-DD or ''
  q: string;
}

export const EMPTY_FILTERS: WalletHistoryFilters = { venueId: '', type: 'ALL', from: '', to: '', q: '' };

function queryString(filters: WalletHistoryFilters, extra: Record<string, string>) {
  const p = new URLSearchParams();
  if (filters.venueId) p.set('venue_id', filters.venueId);
  if (filters.type !== 'ALL') p.set('type', filters.type);
  if (filters.from) p.set('from', filters.from);
  if (filters.to) p.set('to', filters.to);
  if (filters.q.trim()) p.set('q', filters.q.trim());
  for (const [k, v] of Object.entries(extra)) p.set(k, v);
  return p.toString();
}

export function useWalletHistory(handle: string | null, filters: WalletHistoryFilters) {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [venues, setVenues] = useState<HistoryVenue[]>([]);
  const [summary, setSummary] = useState<HistoryResult['summary'] | null>(null);
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
      const qs = queryString(JSON.parse(filtersKey) as WalletHistoryFilters, {
        handle,
        limit: '25',
        ...(before ? { before } : {}),
      });
      const res = await fetch(`/api/guest/wallet/history?${qs}`, { headers: walletAuthHeaders(), cache: 'no-store' });
      const data = await res.json();
      if (id !== requestRef.current) return; // a newer request has replaced this one
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not load your history.');
      const result = data as HistoryResult;
      setRows((prev) => (append ? [...prev, ...result.transactions] : result.transactions));
      setVenues(result.venues);
      setSummary(result.summary);
      setHasMore(result.has_more);
      setNextBefore(result.next_before);
    } catch (e: any) {
      if (id === requestRef.current) setError(e?.message || 'Could not load your history.');
    } finally {
      if (id === requestRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [handle, filtersKey]);

  // Any change of handle or filters starts again from the newest row.
  useEffect(() => {
    if (!handle) {
      setRows([]); setVenues([]); setSummary(null); setHasMore(false);
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
    const qs = queryString(JSON.parse(filtersKey) as WalletHistoryFilters, { handle, format: 'csv' });
    const res = await fetch(`/api/guest/wallet/history?${qs}`, { headers: walletAuthHeaders(), cache: 'no-store' });
    if (!res.ok) throw new Error('The export could not be prepared. Please try again.');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wallet-history-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [handle, filtersKey]);

  return { rows, venues, summary, hasMore, loading, loadingMore, error, loadMore, downloadCsv, retry: () => void fetchPage(null, false) };
}
