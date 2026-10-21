'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { businessFilter } from '@/lib/realtime/channels';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';
import type { InventoryOverview } from '@/lib/services/inventory/inventory.types';

const DEBOUNCE_MS = 900;

/** Stock overview for the venue, refreshed when stock moves anywhere (sales, purchases, counts). */
export function useInventory() {
  const businessId = useHostWorkspace((s) => s.businessId);
  const [data, setData] = useState<InventoryOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const requestId = useRef(0);

  const load = useCallback(async (quiet = false) => {
    const id = ++requestId.current;
    if (quiet) setIsRefreshing(true); else setIsLoading(true);
    try {
      const res = await fetch('/api/host/inventory/items', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (id !== requestId.current) return;
      if (!res.ok) throw new Error(json.error || 'Stock could not be loaded.');
      setData({ items: json.items || [], summary: json.summary });
      setError(null);
      setVersion((v) => v + 1);
    } catch (e: any) {
      if (id === requestId.current) setError(e?.message || 'Stock could not be loaded.');
    } finally {
      if (id === requestId.current) { setIsLoading(false); setIsRefreshing(false); }
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { timer = null; void load(true); }, DEBOUNCE_MS);
    };
    // Only this venue's stock movements wake the refresh (row-level security already hides other venues' rows; the
    // filter keeps their events from reaching this tab at all).
    const supabase = createClient();
    const filter = businessFilter(businessId);
    const channel = supabase.channel(businessId ? `raw_inventory_live_${businessId}` : 'raw_inventory_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'raw_inventory_items', ...(filter ? { filter } : {}) }, schedule)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inventory_logs', ...(filter ? { filter } : {}) }, schedule)
      .subscribe();
    return () => { if (timer) clearTimeout(timer); supabase.removeChannel(channel); };
  }, [load, businessId]);

  /** `version` changes after every reload, so open panels can refresh their history too. */
  return { data, isLoading, isRefreshing, error, version, reload: () => load(true) };
}
