'use client';

import { useCallback, useEffect, useState } from 'react';

export type ReservationStatus = 'requested' | 'confirmed' | 'seated' | 'cancelled' | 'no_show';

export interface HostReservation {
  id: string;
  tableNumber: string;
  guestName: string;
  guestPhone: string;
  partySize: number;
  reservedDate: string;
  reservedTime: string;
  status: ReservationStatus;
  notes: string;
}

export type ReservationFilter = 'upcoming' | 'all';

/** The venue's reservations, refreshed when the host returns to the tab, and status changes applied at once. */
export function useReservations(filter: ReservationFilter) {
  const [items, setItems] = useState<HostReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/host/reservations?filter=${filter}`, { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Reservations could not be loaded.');
      setItems(json.reservations ?? []);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    void load();
    const onVisible = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  const setStatus = async (id: string, status: ReservationStatus) => {
    setBusyId(id);
    const previous = items;
    setItems((list) => list.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      const res = await fetch('/api/host/reservations', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not update the reservation.');
    } catch (e: any) {
      setItems(previous);
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return { items, loading, error, busyId, setStatus, reload: load };
}
