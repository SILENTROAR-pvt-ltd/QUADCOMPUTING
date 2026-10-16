'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';

export interface HostEvent {
  id: string; title: string; description: string | null; banner_url: string | null; category: string;
  starts_at: string; ends_at: string | null; entry_fee: number; perks: string[]; capacity: number | null;
  male_capacity: number | null; female_capacity: number | null;
  status: 'DRAFT' | 'LIVE' | 'CANCELLED'; seats_booked: number; men_booked: number; women_booked: number; interested_parties: number;
}

/** The venue's live events: load, publish, change status, remove. Each call returns an error message, or null when it worked. */
export function useHostEvents() {
  const [events, setEvents] = useState<HostEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await apiRequest<{ events: HostEvent[] }>('/api/host/live-events', { cache: 'no-store' });
    if (r.ok && r.data) { setEvents(r.data.events); setError(null); } else setError(r.error || 'Could not load events.');
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const run = async (url: string, init: RequestInit): Promise<string | null> => {
    const r = await apiRequest(url, init);
    if (!r.ok) return r.error || 'That could not be saved.';
    await load();
    return null;
  };

  return {
    events, loading, error, reload: load,
    publish: (body: Record<string, unknown>) => run('/api/host/live-events', jsonRequest('POST', body)),
    setStatus: (id: string, status: HostEvent['status']) => run('/api/host/live-events', jsonRequest('PATCH', { id, status })),
    remove: (id: string) => run(`/api/host/live-events?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
  };
}
