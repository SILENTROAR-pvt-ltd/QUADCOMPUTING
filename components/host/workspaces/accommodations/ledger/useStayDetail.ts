'use client';

import { useEffect, useState } from 'react';
import type { StayDetail } from '@/lib/services/accommodation/stay-detail.service';

/** One past stay in full, read when the desk opens it. */
export function useStayDetail(logId: string | null) {
  const [detail, setDetail] = useState<StayDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!logId) { setDetail(null); setError(null); return; }
    let alive = true;
    setLoading(true); setError(null); setDetail(null);
    void (async () => {
      try {
        const res = await fetch(`/api/host/accommodations/history/${encodeURIComponent(logId)}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok || !data.success) setError(data.error || 'This stay could not be opened.');
        else setDetail(data as StayDetail);
      } catch {
        if (alive) setError('Could not reach the server. Check the connection and try again.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [logId]);

  return { detail, loading, error };
}
