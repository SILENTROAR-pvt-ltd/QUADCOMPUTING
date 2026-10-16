'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';

export interface EventLead {
  id: string; guest_name: string; vibers_handle: string | null; email: string | null; phone: string | null;
  party_size: number; party_male: number; party_female: number; party_other: number;
  status: 'INTERESTED' | 'CONFIRMED' | 'DECLINED'; created_at: string;
}

/** The guest list of one event, refreshed on demand, with confirm / decline. */
export function useEventLeads(eventId: string | null) {
  const [leads, setLeads] = useState<EventLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!eventId) { setLeads([]); return; }
    setLoading(true);
    const r = await apiRequest<{ leads: EventLead[] }>(`/api/host/live-events/leads?event_id=${encodeURIComponent(eventId)}`, { cache: 'no-store' });
    if (r.ok && r.data) { setLeads(r.data.leads); setError(null); } else setError(r.error || 'Could not load the guest list.');
    setLoading(false);
  }, [eventId]);
  useEffect(() => { void load(); }, [load]);

  const setStatus = async (id: string, status: EventLead['status']) => {
    const r = await apiRequest('/api/host/live-events/leads', jsonRequest('PATCH', { id, status }));
    if (!r.ok) { setError(r.error || 'That could not be saved.'); return; }
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
  };

  return { leads, loading, error, reload: load, setStatus };
}
