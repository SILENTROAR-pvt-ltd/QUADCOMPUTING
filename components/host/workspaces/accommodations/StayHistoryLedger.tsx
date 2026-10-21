'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { HistoricalStayRecord, RoomCategory, StayHistoryMetrics } from '@/types';
import { filterPastStays } from '@/lib/utils/accommodations';
import { DigitalReceiptModal, mapFolioToReceipt } from '@/components/shared/DigitalReceipt';
import { StayHistoryMetricsRibbon } from './ledger/StayHistoryMetricsRibbon';
import { StayHistoryFilterBar } from './ledger/StayHistoryFilterBar';
import { StayHistoryList } from './ledger/StayHistoryList';
import { StayDetailSheet } from './ledger/StayDetailSheet';

const EMPTY: StayHistoryMetrics = { totalCheckouts: 0, checkoutsThisMonth: 0, totalRevenue: 0, revenueThisMonth: 0, avgLengthOfStay: 0, totalGuestsHosted: 0 };

/** Every past stay at the venue: the numbers, a way to find one, and the whole record of each. */
export function StayHistoryLedger({ categories }: { categories: RoomCategory[] }) {
  const [stays, setStays] = useState<HistoricalStayRecord[]>([]);
  const [metrics, setMetrics] = useState<StayHistoryMetrics>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedTimeframe, setSelectedTimeframe] = useState('ALL');
  const [open, setOpen] = useState<HistoricalStayRecord | null>(null);
  const [invoiceFor, setInvoiceFor] = useState<HistoricalStayRecord | null>(null);

  const load = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (selectedCategory !== 'ALL') params.set('category_id', selectedCategory);
      const res = await fetch(`/api/host/accommodations/history?${params}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setStays(data.stays || []);
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Failed to load stay history', err);
    } finally {
      setIsLoading(false); setIsRefreshing(false);
    }
  }, [searchQuery, selectedCategory]);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => filterPastStays(stays, searchQuery, selectedCategory, selectedTimeframe), [stays, searchQuery, selectedCategory, selectedTimeframe]);
  const hasActiveFilters = Boolean(searchQuery || selectedCategory !== 'ALL' || selectedTimeframe !== 'ALL');
  const clearFilters = () => { setSearchQuery(''); setSelectedCategory('ALL'); setSelectedTimeframe('ALL'); };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <StayHistoryMetricsRibbon metrics={metrics} />
      <StayHistoryFilterBar searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} categories={categories} selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory}
        selectedTimeframe={selectedTimeframe} onTimeframeChange={setSelectedTimeframe} isRefreshing={isRefreshing} onRefresh={() => void load()} />
      <StayHistoryList stays={filtered} isLoading={isLoading} hasActiveFilters={hasActiveFilters} onClearFilters={clearFilters} onOpen={setOpen} />

      {open && <StayDetailSheet stay={open} onClose={() => setOpen(null)} onOpenInvoice={setInvoiceFor} />}
      {invoiceFor && <DigitalReceiptModal invoice={mapFolioToReceipt(invoiceFor)} onClose={() => setInvoiceFor(null)} />}
    </div>
  );
}
