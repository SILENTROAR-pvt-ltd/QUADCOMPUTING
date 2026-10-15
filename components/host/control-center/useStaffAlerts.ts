'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { businessFilter } from '@/lib/realtime/channels';

export interface StaffAlert {
  id: string;
  table_number: string | null;
  notification_type: string;
  message: string | null;
  status: string;
  created_at: string;
}

/** Pending guest calls / system alerts for the venue, live. */
export function useStaffAlerts(venueId?: string) {
  const [alerts, setAlerts] = useState<StaffAlert[]>([]);
  const knownIds = useRef<Set<string>>(new Set());
  const loadedOnce = useRef(false);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/host/notifications', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const list: StaffAlert[] = data.notifications || [];
      const incoming = list.filter((a) => !knownIds.current.has(a.id)).map((a) => a.id);
      // The very first load is not "new". (It used to be skipped by "nothing was known yet", which also swallowed
      // the first call of the day on a quiet venue.)
      if (loadedOnce.current && incoming.length) setFreshIds(new Set(incoming));
      loadedOnce.current = true;
      knownIds.current = new Set(list.map((a) => a.id));
      setAlerts(list);
    } catch {}
  }, []);

  const resolve = useCallback(async (id?: string) => {
    setAlerts((prev) => (id ? prev.filter((a) => a.id !== id) : []));
    try {
      await fetch('/api/host/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(id ? { id } : { all: true }),
      });
    } finally {
      void fetchAlerts();
    }
  }, [fetchAlerts]);

  useEffect(() => {
    if (!venueId) return;
    void fetchAlerts();

    // Realtime is the primary signal (RLS lets the host read its venue's rows); the poll covers a dropped socket. It keeps
    // running in a background tab (the browser slows it there) so a guest's call still rings on a screen nobody is looking at.
    const interval = setInterval(() => { void fetchAlerts(); }, 15000);
    const onVisible = () => { if (!document.hidden) void fetchAlerts(); };
    document.addEventListener('visibilitychange', onVisible);

    const sb = createClient();
    const channel = sb
      .channel(`staff_alerts_${venueId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_notifications', filter: businessFilter(venueId) }, () => void fetchAlerts())
      .subscribe();

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      void sb.removeChannel(channel);
    };
  }, [venueId, fetchAlerts]);

  return { alerts, freshIds, resolve };
}
