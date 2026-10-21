'use client';

import { useCallback, useEffect, useState } from 'react';
import type { StayBooking } from '../accommodations/bookings/useStayBookings';
import type { ReservationFilter } from './useReservations';

export type { StayBooking };
export type RoomBookingAction = 'confirm' | 'cancel' | 'no_show';

/** Nights between the booking's dates, at least one. */
export const bookingNights = (b: Pick<StayBooking, 'check_in' | 'check_out'>) => Math.max(1, Math.round((Date.parse(b.check_out) - Date.parse(b.check_in)) / 86_400_000));

/**
 * Room reservations beside the table ones: the venue's stay bookings (guest, dates, room type, paid or not), refreshed
 * when the host returns to the tab, with the same quick actions the Accommodations desk has. Upcoming means every
 * booking still open whose stay has not ended; all is the whole history.
 */
export function useRoomReservations(filter: ReservationFilter) {
  const [items, setItems] = useState<StayBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/host/accommodations/bookings?scope=${filter === 'upcoming' ? 'upcoming' : 'all'}`, { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.error || 'Room reservations could not be loaded.');
      const list: StayBooking[] = json.bookings ?? [];
      // Newest first in the history; soonest first for what is still to come.
      setItems(filter === 'all' ? [...list].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)) : list);
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

  const act = async (id: string, action: RoomBookingAction) => {
    setBusyId(id);
    try {
      const res = await fetch('/api/host/accommodations/bookings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not update the booking.');
      setItems((list) => list.map((b) => (b.id === id ? { ...b, ...json.booking } : b)));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return { items, loading, error, busyId, act, reload: load };
}
