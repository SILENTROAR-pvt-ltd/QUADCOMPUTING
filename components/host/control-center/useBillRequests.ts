'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { businessFilter } from '@/lib/realtime/channels';
import { useFloorPing } from '@/lib/hooks/use-floor-ping';
import { sharedGet } from '@/lib/utils/shared-get';
import { usePoll } from '@/lib/utils/use-poll';

export interface BillRequestItem {
  tableNumber: string;
  subtotal: number;
}

/** The safety-net read. A change at a table (a guest asking, a bill settled) reads at once through the signals below. */
const POLL_MS = 20_000;
const COALESCE_MS = 150;

/** Tables that have asked for their bill, for the sidebar alert. Reads on every change at the venue, and slowly otherwise. */
export function useBillRequests(venueId?: string) {
  const [billRequests, setBillRequests] = useState<BillRequestItem[]>([]);

  const check = useCallback(async () => {
    const [live, history] = await Promise.all([
      sharedGet<any>('/api/host/sessions'),
      sharedGet<any>('/api/host/sessions?view=bill_requests'),
    ]);

    const reqsMap = new Map<string, BillRequestItem>();
    if (live.ok && live.data?.sessions) {
      Object.values(live.data.sessions).forEach((s: any) => {
        if (s.status === 'bill_requested') {
          const tNum = s.tableNumber || 'Table';
          reqsMap.set(tNum, { tableNumber: tNum, subtotal: Number(s.subtotal) || Number(s.grandTotal) || 0 });
        }
      });
    }
    if (history.ok && Array.isArray(history.data?.requests)) {
      history.data.requests.forEach((r: any) => {
        if (!r.settled_at && r.session_status !== 'closed') {
          const tNum = r.table_number || 'Table';
          if (!reqsMap.has(tNum)) reqsMap.set(tNum, { tableNumber: tNum, subtotal: Number(r.running_total) || 0 });
        }
      });
    }
    setBillRequests(Array.from(reqsMap.values()));
  }, []);

  // One read for a burst of changes (a settlement touches the session, the order and the request rows together).
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const schedule = useCallback(() => {
    if (timer.current) return;
    timer.current = setTimeout(() => { timer.current = null; void check(); }, COALESCE_MS);
  }, [check]);

  useFloorPing(venueId || null, schedule);

  useEffect(() => {
    void check();
    if (!venueId) return;
    const sb = createClient();
    const filter = businessFilter(venueId);
    const channel = sb.channel(`bill_requests_${venueId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dine_in_sessions', ...(filter ? { filter } : {}) }, schedule)
      .subscribe();
    return () => {
      if (timer.current) { clearTimeout(timer.current); timer.current = null; }
      void sb.removeChannel(channel);
    };
  }, [venueId, check, schedule]);
  usePoll(() => { void check(); }, POLL_MS);

  return { billRequests };
}
