'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { businessFilter } from '@/lib/realtime/channels';
import { useFloorPing } from '@/lib/hooks/use-floor-ping';

export interface StaffAlert {
  id: string;
  table_number: string | null;
  notification_type: string;
  message: string | null;
  status: string;
  created_at: string;
}

/** Two signals for one change (the row and the floor ping) arrive together; this gathers them into one read. */
const COALESCE_MS = 120;

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

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleFetch = useCallback(() => {
    if (timer.current) return;
    timer.current = setTimeout(() => { timer.current = null; void fetchAlerts(); }, COALESCE_MS);
  }, [fetchAlerts]);

  // The venue's floor ping: a staff phone signed in by PIN has no database login, so the row change below never reaches
  // it; the ping does, the moment a call is made or handled (migration 20261022000003).
  useFloorPing(venueId || null, scheduleFetch);

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_notifications', filter: businessFilter(venueId) }, scheduleFetch)
      .subscribe();

    return () => {
      clearInterval(interval);
      if (timer.current) { clearTimeout(timer.current); timer.current = null; }
      document.removeEventListener('visibilitychange', onVisible);
      void sb.removeChannel(channel);
    };
  }, [venueId, fetchAlerts, scheduleFetch]);

  return { alerts, freshIds, resolve };
}
