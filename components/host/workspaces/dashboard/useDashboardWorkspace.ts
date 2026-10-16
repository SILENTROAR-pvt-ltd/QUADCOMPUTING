'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { DashboardAnalyticsPayload } from './dashboard.types';

export type Timeframe = 'daily' | 'yesterday' | 'weekly' | '30d' | 'mtd' | 'monthly' | 'custom';
// A burst of order and kitchen events becomes one refresh, so the dashboard does not reload per event.
const REALTIME_DEBOUNCE_MS = 1500;

export function useDashboardWorkspace(venueId?: string) {
  const [data, setData] = useState<DashboardAnalyticsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEodModalOpen, setIsEodModalOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<Timeframe>('daily');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeRange, setActiveRange] = useState<{ start: string; end: string } | null>(null);
  const [isOrdersSheetOpen, setIsOrdersSheetOpen] = useState(false);
  const [isKitchenSheetOpen, setIsKitchenSheetOpen] = useState(false);
  const [isAddPromoOpen, setIsAddPromoOpen] = useState(false);
  const [isDeletingPromo, setIsDeletingPromo] = useState<string | null>(null);
  const requestId = useRef(0);

  // `quiet` refreshes keep the numbers on screen; only a new period shows the loading state.
  const loadData = useCallback(async (quiet = false) => {
    // Custom with no dates applied yet: keep the figures on screen instead of loading a default period under a Custom tab.
    if (timeframe === 'custom' && !activeRange) return;
    const id = ++requestId.current;
    if (quiet) setIsRefreshing(true); else setIsLoading(true);
    try {
      const params = new URLSearchParams({ range: timeframe, timeframe });
      if (timeframe === 'custom' && activeRange) {
        params.set('startDate', activeRange.start); params.set('endDate', activeRange.end);
      }
      if (venueId) params.set('business_id', venueId);
      const res = await fetch(`/api/host/analytics/eod-report?${params.toString()}`, { cache: 'no-store' });
      if (res.ok && id === requestId.current) setData(await res.json());
    } catch (e) {
      console.error('Failed to load dashboard data', e);
    } finally {
      if (id === requestId.current) { setIsLoading(false); setIsRefreshing(false); }
    }
  }, [timeframe, activeRange, venueId]);

  useEffect(() => {
    void loadData();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { timer = null; void loadData(true); }, REALTIME_DEBOUNCE_MS);
    };
    const supabase = createClient();
    const filter = venueId ? `business_id=eq.${venueId}` : undefined;
    const channel = supabase.channel(venueId ? `realtime_dashboard_${venueId}` : 'realtime_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', ...(filter ? { filter } : {}) }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kitchen_tickets', ...(filter ? { filter } : {}) }, schedule)
      .subscribe();
    return () => { if (timer) clearTimeout(timer); supabase.removeChannel(channel); };
  }, [loadData, venueId]);

  const handleDeletePromotion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promotion?')) return;
    setIsDeletingPromo(id);
    try {
      const res = await fetch(`/api/host/promotions?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete promotion');
      void loadData(true);
    } catch (e: any) {
      alert(e.message || 'Error deleting promotion');
    } finally {
      setIsDeletingPromo(null);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

  return {
    data, isLoading, isRefreshing, isEodModalOpen, setIsEodModalOpen, timeframe, setTimeframe,
    startDate, setStartDate, endDate, setEndDate, activeRange, setActiveRange,
    isOrdersSheetOpen, setIsOrdersSheetOpen, isKitchenSheetOpen, setIsKitchenSheetOpen,
    isAddPromoOpen, setIsAddPromoOpen, isDeletingPromo, loadData, handleDeletePromotion, formatCurrency,
  };
}
