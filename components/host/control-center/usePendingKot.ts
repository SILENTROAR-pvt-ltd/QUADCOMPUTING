'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { businessFilter } from '@/lib/realtime/channels';
import { sharedGet } from '@/lib/utils/shared-get';
import { usePoll } from '@/lib/utils/use-poll';

const POLL_MS = 8000;

/** New kitchen tickets for the sidebar dot. Realtime is the main signal; the poll catches a dropped socket. */
export function usePendingKot(cafeId?: string) {
  const [pendingKotCount, setPendingKotCount] = useState(0);

  const fetchPending = useCallback(async () => {
    const url = cafeId ? `/api/host/kitchen/tickets?business_id=${encodeURIComponent(cafeId)}` : '/api/host/kitchen/tickets';
    const res = await sharedGet<{ tickets?: any[] }>(url);
    if (res.ok) {
      setPendingKotCount((res.data?.tickets || []).filter((t: any) => t.status === 'PENDING').length);
    }
  }, [cafeId]);

  useEffect(() => {
    void fetchPending();
    const sb = createClient();
    const ch = sb
      .channel(`global_kot_dot_${cafeId || 'default'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kitchen_tickets', filter: businessFilter(cafeId) }, () => { void fetchPending(); })
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [cafeId, fetchPending]);

  usePoll(() => { void fetchPending(); }, POLL_MS);

  return { pendingKotCount };
}
