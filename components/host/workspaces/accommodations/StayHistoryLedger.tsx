'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { HistoricalStayRecord, RoomCategory, StayHistoryMetrics } from '@/types';
import { filterPastStays } from '@/lib/utils/accommodations';
import { DigitalReceiptModal, mapFolioToReceipt } from '@/components/shared/DigitalReceipt';
import { StayHistoryMetricsRibbon } from './ledger/StayHistoryMetricsRibbon';
import { StayHistoryFilterBar } from './ledger/StayHistoryFilterBar';
import { StayHistoryTable } from './ledger/StayHistoryTable';

interface Props {
  categories: RoomCategory[];
}

export function StayHistoryLedger({ categories }: Props) {
  const [stays, setStays] = useState<HistoricalStayRecord[]>([]);
  const [metrics, setMetrics] = useState<StayHistoryMetrics>({
    totalCheckouts: 0,
    checkoutsThisMonth: 0,
    totalRevenue: 0,
    revenueThisMonth: 0,
    avgLengthOfStay: 0,
    totalGuestsHosted: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('ALL');
  const [selectedStayForInvoice, setSelectedStayForInvoice] = useState<HistoricalStayRecord | null>(null);

  // Fetch stay history from API
  const fetchStayHistory = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (selectedCategory !== 'ALL') params.append('category_id', selectedCategory);

      const res = await fetch(`/api/host/accommodations/history?${params.toString()}`, {
        cache: 'no-store'
      });

      if (res.ok) {
        const data = await res.json();
        setStays(data.stays || []);
        if (data.metrics) {
          setMetrics(data.metrics);
        }
      }
    } catch (err) {
      console.error('Failed to load stay history', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    fetchStayHistory();
  }, [fetchStayHistory]);

  // Client-side filtering for immediate snappy responsiveness
  const filteredStays = useMemo(() => {
    return filterPastStays(stays, searchQuery, selectedCategory, selectedTimeframe);
  }, [stays, searchQuery, selectedCategory, selectedTimeframe]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedTimeframe('ALL');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Summary Metrics Ribbon */}
      <StayHistoryMetricsRibbon metrics={metrics} />

      {/* 2. Search & Filter Bar */}
      <StayHistoryFilterBar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedTimeframe={selectedTimeframe}
        onTimeframeChange={setSelectedTimeframe}
        isRefreshing={isRefreshing}
        onRefresh={fetchStayHistory}
      />

      {/* 3. Stay Ledger Audit Table */}
      <StayHistoryTable
        stays={filteredStays}
        isLoading={isLoading}
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        selectedTimeframe={selectedTimeframe}
        onClearFilters={handleClearFilters}
        onSelectForInvoice={setSelectedStayForInvoice}
      />

      {/* 4. Unified Digital Invoice & Folio Modal */}
      {selectedStayForInvoice && (
        <DigitalReceiptModal
          invoice={mapFolioToReceipt(selectedStayForInvoice)}
          onClose={() => setSelectedStayForInvoice(null)}
        />
      )}
    </div>
  );
}
