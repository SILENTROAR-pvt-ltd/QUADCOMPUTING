'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { businessFilter } from '@/lib/realtime/channels';
import type { KitchenTicket } from '@/lib/utils/kitchen';
import { getInitialCachedTickets, saveCachedTickets } from './kitchen-cache.util';
import { KOTMinHeap } from '@/lib/utils/kot-min-heap.util';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';

export function useKitchenTickets(playChime: () => void, cafeId?: string) {
  const [tickets, setTickets] = useState<KitchenTicket[]>([]), [isLoading, setIsLoading] = useState(true);
  const lastCountRef = useRef(0);

  const fetchTickets = useCallback(async (silent = false) => {
    try {
      const url = cafeId ? `/api/host/kitchen/tickets?business_id=${encodeURIComponent(cafeId)}` : '/api/host/kitchen/tickets';
      // Live tickets must never come from the browser's HTTP cache.
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const { tickets: fetched } = await res.json();
        
        // 🚀 Algorithmic Integration: Min-Heap for KOT Priority
        // Dynamically sorts tickets based on wait time and urgency ($O(N \log N)$ construction)
        const heap = new KOTMinHeap(fetched || []);
        const list: KitchenTicket[] = heap.getSortedArray();
        
        setTickets(list);
        saveCachedTickets(cafeId, list);
        const pending = list.filter((t) => t.status === 'PENDING').length;
        if (pending > lastCountRef.current) playChime();
        lastCountRef.current = pending;
      }
    } catch (e) {
      console.error('[KOT fetch error]', e);
    } finally { if (!silent) setIsLoading(false); }
  }, [cafeId, playChime]);

  useEffect(() => {
    const cached = getInitialCachedTickets(cafeId);
    if (cached.length > 0) { setTickets(cached); setIsLoading(false); }
    fetchTickets(cached.length > 0);
    const sb = createClient();
    const ch = sb.channel(`realtime_kitchen_${cafeId || 'default'}`).on('postgres_changes', { event: '*', schema: 'public', table: 'kitchen_tickets', filter: businessFilter(cafeId) }, (p) => {
      if ((p.new as any)?.status === 'PENDING') playChime();
      fetchTickets(true);
    }).subscribe();
    return () => { sb.removeChannel(ch); };
  }, [cafeId, fetchTickets, playChime]);

  // Mirror of state so the request is sent once, outside any state updater (React may run
  // updaters twice, which used to send the PATCH twice).
  const ticketsRef = useRef<KitchenTicket[]>([]);
  ticketsRef.current = tickets;

  const toggleItemDone = useCallback(async (ticketId: string, itemIdx: number) => {
    const target = ticketsRef.current.find((t) => t.id === ticketId);
    if (!target || !target.items[itemIdx]) return;
    const updated = [...target.items];
    updated[itemIdx] = { ...updated[itemIdx], completed: !updated[itemIdx].completed };

    setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, items: updated } : t)));

    const result = await apiRequest('/api/host/kitchen/tickets', jsonRequest('PATCH', { id: ticketId, items: updated, business_id: cafeId }));
    // fetch() only rejects on network errors; a 4xx/5xx also means the tick was not saved.
    if (!result.ok) fetchTickets(true);
  }, [cafeId, fetchTickets]);
  return { tickets, setTickets, isLoading, fetchTickets, toggleItemDone };
}
