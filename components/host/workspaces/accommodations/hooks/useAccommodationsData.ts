'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { PhysicalRoom, RoomCategory } from '@/types';
import { assignReservedRooms, type ReservationLite } from '@/lib/services/stay/reservation-overlay';
import { todayIst } from '@/components/stay/stay-format';

// A burst of changes (a checkout touches the room, the invoice and room service) becomes one reload.
const REALTIME_DEBOUNCE_MS = 800;
// A guest's booking is written by a phone, not by the desk, and the table is server-only so it cannot be subscribed to.
// A visible front desk therefore looks again every half minute, so a new reservation shows without a refresh.
const POLL_MS = 30_000;

export type LiveState = 'connecting' | 'live' | 'offline';
export type Reservation = ReservationLite & Record<string, any>;

/** Room categories, rooms and the bookings holding them, for the front desk; kept current through Supabase Realtime and a light poll. */
export function useAccommodationsData() {
  const [categories, setCategories] = useState<RoomCategory[]>([]);
  const [rawRooms, setRawRooms] = useState<PhysicalRoom[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [live, setLive] = useState<LiveState>('connecting');
  const requestId = useRef(0);
  const businessId = rawRooms[0]?.business_id || categories[0]?.business_id || null;

  /** `quiet` keeps the grid on screen; only the first load shows placeholders. */
  const loadData = useCallback(async (quiet = false) => {
    const id = ++requestId.current;
    if (quiet) setIsRefreshing(true); else setIsLoading(true);
    try {
      const [catRes, roomsRes, bookRes] = await Promise.all([
        fetch('/api/host/accommodations/categories', { cache: 'no-store' }),
        fetch('/api/host/accommodations/rooms', { cache: 'no-store' }),
        // Bookings are an addition to the front desk, not a requirement of it: if they cannot be read the rooms still show.
        fetch('/api/host/accommodations/bookings?scope=upcoming', { cache: 'no-store' }).catch(() => null),
      ]);
      if (id !== requestId.current) return;
      if (!catRes.ok || !roomsRes.ok) throw new Error('load');
      const [cat, rm, bk] = await Promise.all([catRes.json(), roomsRes.json(), bookRes?.ok ? bookRes.json().catch(() => null) : Promise.resolve(null)]);
      setCategories(cat.categories || []);
      setRawRooms(rm.rooms || []);
      if (bk?.success) setReservations(bk.bookings || []);
      setLoadError(null);
    } catch {
      if (id === requestId.current) setLoadError('The front desk could not be refreshed. Showing the last known state.');
    } finally {
      if (id === requestId.current) { setIsLoading(false); setIsRefreshing(false); }
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  useEffect(() => {
    const tick = setInterval(() => { if (document.visibilityState === 'visible') void loadData(true); }, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') void loadData(true); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(tick); document.removeEventListener('visibilitychange', onVisible); };
  }, [loadData]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { timer = null; void loadData(true); }, REALTIME_DEBOUNCE_MS);
    };
    const supabase = createClient();
    const filter = businessId ? { filter: `business_id=eq.${businessId}` } : {};
    const channel = supabase.channel(`front_desk_${businessId || 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', ...filter }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_categories', ...filter }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', ...filter }, (p: any) => {
        // Only orders on a room change the front desk.
        if (p?.new?.room_id || p?.old?.room_id) schedule();
      })
      .subscribe((status) => setLive(status === 'SUBSCRIBED' ? 'live' : status === 'CLOSED' || status === 'CHANNEL_ERROR' ? 'offline' : 'connecting'));
    return () => { if (timer) clearTimeout(timer); supabase.removeChannel(channel); };
  }, [businessId, loadData]);

  // Free rooms that a booking due now is holding carry that booking, so the desk shows them as Reserved.
  const rooms = useMemo(() => {
    const held = assignReservedRooms(rawRooms, reservations, todayIst());
    return rawRooms.map((r) => (held.has(r.id) ? { ...r, reserved_for: held.get(r.id) } : r));
  }, [rawRooms, reservations]);

  return { categories, rooms, reservations, isLoading, isRefreshing, loadError, live, loadData };
}
