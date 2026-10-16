'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';
import { createClient } from '@/lib/supabase/client';
import { businessFilter } from '@/lib/realtime/channels';
import { sharedGet } from '@/lib/utils/shared-get';
import type { TableLiveSessionInfo } from '@/types/qr-session';

export interface RestaurantTable {
  id: string;
  table_number: string;
  seating_capacity: number;
  status: 'VACANT' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';
  is_active: boolean;
  activeSession?: TableLiveSessionInfo;
}

const DEFAULT_TABLES: RestaurantTable[] = [];

/** `pollMs`: how often the tables are read again behind the realtime signal (15 s by default; a PIN staff phone has no realtime, so reads faster). */
export function usePOSTables(propsBusinessId?: string | null, options: { pollMs?: number } = {}) {
  const pollMs = options.pollMs ?? 15000;
  const profile = useHostWorkspace((state) => state.profile);

  const [tables, setTables] = useState<RestaurantTable[]>(DEFAULT_TABLES);
  const [businessId, setBusinessId] = useState<string | null>(propsBusinessId || null);
  const [sessionsMap, setSessionsMap] = useState<Record<string, TableLiveSessionInfo>>({});
  const [isOnline, setIsOnline] = useState(true);
  // True once the first read of the tables has come back (or failed), so screens can show placeholders until then.
  const [loaded, setLoaded] = useState(false);
  const [activeStaff, setActiveStaff] = useState<{ id: string; name: string; role: string } | null>(null);
  const latestTableFetch = useRef(0);

  // Sync businessId if props change
  useEffect(() => {
    if (propsBusinessId) setBusinessId(propsBusinessId);
  }, [propsBusinessId]);

  // Rehydrate cached tables after mount to prevent SSR mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.removeItem('pos_tables_cache'); // Cleanup legacy cross-tenant leak
    if (!businessId) return;
    try {
      const cached = localStorage.getItem(`pos_tables_cache_${businessId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) setTables(parsed);
      }
    } catch {}
  }, [businessId]);

  // Initialize staff
  useEffect(() => {
    if (profile && !activeStaff) {
      setActiveStaff({ id: profile.uniqueOwnerCafeId || 'host_staff', name: profile.displayName || 'Host', role: 'HOST' });
    }
  }, [profile, activeStaff]);

  // Online / Offline monitor
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch active dine-in sessions
  const fetchSessions = useCallback(async () => {
    // Shared with the sidebar's bill-request poll, so one screen sends one request, not two.
    const res = await sharedGet<{ sessions?: Record<string, TableLiveSessionInfo> }>('/api/host/sessions');
    if (!res.ok) return {};
    const sessions = res.data?.sessions || {};
    setSessionsMap(sessions);
    return sessions;
  }, []);

  // Fetch restaurant tables merged with session info
  const fetchTables = useCallback(async () => {
    const fetchId = ++latestTableFetch.current;
    try {
      const targetBiz = businessId || '';
      const tablesUrl = targetBiz ? `/api/host/tables?business_id=${encodeURIComponent(targetBiz)}` : '/api/host/tables';
      const [tablesRes, currentSessions] = await Promise.all([
        fetch(tablesUrl, { cache: 'no-store' }),
        fetchSessions(),
      ]);

      if (tablesRes.ok && fetchId === latestTableFetch.current) {
        const data = await tablesRes.json();
        if (data.businessId) setBusinessId(data.businessId);
        const activeTables = (data.tables || []).filter((t: any) => t.is_active);

        const normalizeTable = (t: string) => (t || '').replace(/^(table|t-)\s*/i, '').trim().toUpperCase();

        const merged: RestaurantTable[] = activeTables.map((t: any) => {
          const norm = normalizeTable(t.table_number);
          const session = currentSessions[t.id] || currentSessions[t.table_number] || currentSessions[`T-${norm}`] || currentSessions[norm];
          const hasActiveOrder = Boolean(
            session && (
              Number(session.subtotal) > 0 ||
              Number(session.grandTotal) > 0 ||
              Number(session.itemsCount) > 0 ||
              session.status === 'bill_requested'
            )
          );

          const rawStatus = (t.status || 'VACANT').toUpperCase();
          const dbStatus = ['VACANT', 'OCCUPIED', 'RESERVED', 'CLEANING'].includes(rawStatus)
            ? rawStatus
            : 'VACANT';
          const effectiveStatus = hasActiveOrder ? 'OCCUPIED' : dbStatus;

          return {
            ...t,
            activeSession: hasActiveOrder ? session : undefined,
            status: effectiveStatus,
          };
        });

        setTables(merged);
        if (typeof window !== 'undefined' && targetBiz) {
          try { localStorage.setItem(`pos_tables_cache_${targetBiz}`, JSON.stringify(merged)); } catch {}
        }
      }
    } catch (e) {
      // A dropped connection or a dev-server restart rejects fetch with a TypeError. The last tables stay on screen
      // and the next poll (or the realtime signal) refreshes them, so this is not an error worth surfacing.
      if (e instanceof TypeError) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) setIsOnline(false);
        return;
      }
      console.warn('Could not refresh tables', e);
    } finally {
      setLoaded(true);
    }
  }, [businessId, fetchSessions]);

  // Mark table vacant immediately with optimistic UI update and backend mutation
  const markTableVacant = useCallback(async (tableIdOrNumber: string, backendAlreadyUpdated = false) => {
    const normalizeT = (s: string) => (s || '').replace(/^(table|t-)\s*/i, '').trim().toUpperCase();
    const targetNorm = normalizeT(tableIdOrNumber);

    // 1. Optimistic state mutation: clear activeSession and set status = VACANT immediately
    setTables((prev) =>
      prev.map((t) => {
        if (t.id === tableIdOrNumber || t.table_number === tableIdOrNumber || normalizeT(t.table_number) === targetNorm) {
          return { ...t, activeSession: undefined, status: 'VACANT' };
        }
        return t;
      })
    );

    // 1b. Clear from sessionsMap so UI immediately releases active badge
    setSessionsMap((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (k === tableIdOrNumber || normalizeT(k) === targetNorm) delete next[k];
      });
      return next;
    });

    // 2. Dispatch backend mutations to clear tables & sessions
    if (!backendAlreadyUpdated) {
      try {
        const targetBiz = businessId || '';
        await Promise.allSettled([
          fetch('/api/host/sessions', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table_id: tableIdOrNumber, table_number: tableIdOrNumber, action: 'mark_vacant', ...(targetBiz ? { business_id: targetBiz } : {}) }),
          }),
          fetch('/api/host/tables', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: tableIdOrNumber, table_number: tableIdOrNumber, status: 'VACANT', ...(targetBiz ? { business_id: targetBiz } : {}) }),
          }),
        ]);
      } catch (e) {
        console.error('Failed marking table vacant:', e);
        await fetchTables();
        throw e;
      }
    }

    // 3. Re-fetch to guarantee real-time consistency
    await fetchTables();
  }, [businessId, fetchTables]);

  // Supabase Realtime Subscription on dine_in_sessions & orders + periodic fallback
  useEffect(() => {
    fetchTables();

    // One order touches orders + order_items + dine_in_sessions + restaurant_tables,
    // so coalesce a burst of realtime events into a single refetch.
    let debounceId: ReturnType<typeof setTimeout> | null = null;
    const scheduleFetch = () => {
      if (debounceId) clearTimeout(debounceId);
      debounceId = setTimeout(() => { debounceId = null; fetchTables(); }, 300);
    };

    // Fallback poll in case the socket drops; realtime is the primary signal.
    // Skipped while the tab is hidden, and caught up as soon as it is visible again.
    const intervalId = setInterval(() => {
      if (typeof document === 'undefined' || !document.hidden) fetchTables();
    }, pollMs);
    const onVisible = () => { if (!document.hidden) scheduleFetch(); };
    document.addEventListener('visibilitychange', onVisible);

    const supabase = createClient();
    const filter = businessFilter(businessId);
    const channel = supabase
      .channel(`realtime_pos_sessions_${businessId || 'default'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dine_in_sessions', filter }, scheduleFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter }, scheduleFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items', filter }, scheduleFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables', filter }, scheduleFetch)
      .subscribe();

    return () => {
      if (debounceId) clearTimeout(debounceId);
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
      supabase.removeChannel(channel);
    };
  }, [fetchTables, businessId, pollMs]);

  return {
    tables,
    loaded,
    businessId,
    sessionsMap,
    fetchTables,
    fetchSessions,
    markTableVacant,
    isOnline,
    activeStaff,
    setActiveStaff,
  };
}
