'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { businessFilter } from '@/lib/realtime/channels';
import { sharedGet } from '@/lib/utils/shared-get';

const POLL_MS = 8000;

/** The ids in `next` that were not in `before`: the tickets that have just arrived. */
export const arrivedTickets = (before: Set<string>, next: string[]) => next.filter((id) => !before.has(id));

/**
 * New kitchen tickets, for the sidebar dot and the order bell. Realtime is the main signal; the poll catches a dropped
 * socket and keeps running in a background tab (the browser slows it there), so an order is still announced.
 * `arrivals` counts tickets that appeared after the first load, so opening the app never rings for old orders.
 */
export function usePendingKot(cafeId?: string) {
  const [pendingKotCount, setPendingKotCount] = useState(0);
  const [arrivals, setArrivals] = useState(0);
  const known = useRef<Set<string> | null>(null);

  const fetchPending = useCallback(async () => {
    const url = cafeId ? `/api/host/kitchen/tickets?business_id=${encodeURIComponent(cafeId)}` : '/api/host/kitchen/tickets';
    const res = await sharedGet<{ tickets?: any[] }>(url);
    if (!res.ok) return;
    const ids = (res.data?.tickets || []).filter((t: any) => t.status === 'PENDING').map((t: any) => String(t.id));
    setPendingKotCount(ids.length);
    if (known.current) {
      const fresh = arrivedTickets(known.current, ids);
      if (fresh.length) setArrivals((n) => n + fresh.length);
    }
    known.current = new Set(ids);
  }, [cafeId]);

  useEffect(() => {
    void fetchPending();
    const sb = createClient();
    const ch = sb
      .channel(`global_kot_dot_${cafeId || 'default'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kitchen_tickets', filter: businessFilter(cafeId) }, () => { void fetchPending(); })
      .subscribe();
    const timer = window.setInterval(() => { void fetchPending(); }, POLL_MS);
    const onVisible = () => { if (!document.hidden) void fetchPending(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { sb.removeChannel(ch); window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [cafeId, fetchPending]);

  return { pendingKotCount, kotArrivals: arrivals };
}
