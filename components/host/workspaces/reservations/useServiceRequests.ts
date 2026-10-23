'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';
import { useFloorPing } from '@/lib/hooks/use-floor-ping';
import type { ServiceRequest } from '@/lib/services/reservations/service-requests.service';

/**
 * Guests' service requests for the Reservations list, live: the venue's floor ping re-reads the moment a guest asks, and a
 * slow poll covers a dropped socket. Done is the bell's own "mark as handled", so the tray clears too.
 */
export function useServiceRequests(venueId: string) {
  const [items, setItems] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await apiRequest<{ requests: ServiceRequest[] }>('/api/host/reservations/services', { cache: 'no-store' });
    if (res.ok) { setItems(res.data?.requests ?? []); setError(null); } else setError(res.error);
    setLoading(false);
  }, []);

  useFloorPing(venueId || null, () => { void load(); });
  useEffect(() => {
    void load();
    const t = setInterval(() => { if (!document.hidden) void load(); }, 20_000);
    return () => clearInterval(t);
  }, [load]);

  const done = useCallback(async (id: string) => {
    setBusyId(id);
    const res = await apiRequest('/api/host/notifications', jsonRequest('PATCH', { id }));
    setBusyId(null);
    if (!res.ok) setError(res.error);
    await load();
  }, [load]);

  return { items, loading, error, busyId, done };
}
