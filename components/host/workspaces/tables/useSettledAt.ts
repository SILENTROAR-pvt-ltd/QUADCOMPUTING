'use client';

import { useCallback, useEffect, useState } from 'react';
import { latestSettledByTable } from '@/lib/utils/live-table-state';

const REFRESH_MS = 60_000;

/** When each table last settled, from the order history, refreshed on its own slow clock (only while the tab is visible). */
export function useSettledAt() {
  const [settledAt, setSettledAt] = useState<Map<string, number>>(new Map());

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/host/orders/history?limit=300', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setSettledAt(latestSettledByTable(Array.isArray(data.orders) ? data.orders : []));
    } catch {
      // Settled tables are a hint; the board still works without them.
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  return { settledAt, reload: load };
}
