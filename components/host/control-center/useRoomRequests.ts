'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { businessFilter } from '@/lib/realtime/channels';

/**
 * Rooms whose guest is waiting on the desk (a check-out or pay-now request on the room itself), so Accommodations
 * lights up for as long as the request stands, whether or not the bell's call was cleared. Live from the rooms table,
 * with a poll behind it.
 */
export function useRoomRequests(venueId?: string): number {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/host/accommodations/rooms', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const rooms: any[] = data.rooms || [];
      setCount(rooms.filter((r) => r?.checkout_request?.status === 'pending' && String(r.status).toUpperCase() === 'OCCUPIED').length);
    } catch { /* the bell's own calls still light the sidebar */ }
  }, []);

  useEffect(() => {
    if (!venueId) return;
    void load();
    const timer = setInterval(() => { void load(); }, 20_000);
    const onVisible = () => { if (!document.hidden) void load(); };
    document.addEventListener('visibilitychange', onVisible);
    const sb = createClient();
    const channel = sb.channel(`room_requests_${venueId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: businessFilter(venueId) }, () => void load())
      .subscribe();
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      void sb.removeChannel(channel);
    };
  }, [venueId, load]);

  return count;
}
