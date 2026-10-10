'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { PhysicalRoom, RoomCategory } from '@/types';

// A burst of changes (a checkout touches the room, the invoice and room service) becomes one reload.
const REALTIME_DEBOUNCE_MS = 800;

export type LiveState = 'connecting' | 'live' | 'offline';

/** Room categories and rooms for the front desk, kept current through Supabase Realtime. */
export function useAccommodationsData() {
  const [categories, setCategories] = useState<RoomCategory[]>([]);
  const [rooms, setRooms] = useState<PhysicalRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [live, setLive] = useState<LiveState>('connecting');
  const requestId = useRef(0);
  const businessId = rooms[0]?.business_id || categories[0]?.business_id || null;

  /** `quiet` keeps the grid on screen; only the first load shows placeholders. */
  const loadData = useCallback(async (quiet = false) => {
    const id = ++requestId.current;
    if (quiet) setIsRefreshing(true); else setIsLoading(true);
    try {
      const [catRes, roomsRes] = await Promise.all([
        fetch('/api/host/accommodations/categories', { cache: 'no-store' }),
        fetch('/api/host/accommodations/rooms', { cache: 'no-store' }),
      ]);
      if (id !== requestId.current) return;
      if (!catRes.ok || !roomsRes.ok) throw new Error('load');
      const [cat, rm] = await Promise.all([catRes.json(), roomsRes.json()]);
      setCategories(cat.categories || []);
      setRooms(rm.rooms || []);
      setLoadError(null);
    } catch {
      if (id === requestId.current) setLoadError('The front desk could not be refreshed. Showing the last known state.');
    } finally {
      if (id === requestId.current) { setIsLoading(false); setIsRefreshing(false); }
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

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

  return { categories, rooms, isLoading, isRefreshing, loadError, live, loadData };
}
