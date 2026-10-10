'use client';

import { useState, useEffect, useCallback } from 'react';
import { sharedGet } from '@/lib/utils/shared-get';
import { usePoll } from '@/lib/utils/use-poll';

export interface BillRequestItem {
  tableNumber: string;
  subtotal: number;
}

const POLL_MS = 6000;

/** Tables that have asked for their bill, for the sidebar alert. Polls only while the tab is visible. */
export function useBillRequests() {
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

  useEffect(() => { void check(); }, [check]);
  usePoll(() => { void check(); }, POLL_MS);

  return { billRequests };
}
