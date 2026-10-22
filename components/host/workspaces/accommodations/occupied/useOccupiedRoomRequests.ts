'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFloorPing } from '@/lib/hooks/use-floor-ping';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';
import type { RoomRequestItem } from '@/lib/services/stay/room-requests.service';

/**
 * The in-house guest's requests this stay, kept live: read when the room opens, again on the venue's floor ping (a new
 * call from the room, or one handled on another screen), and after the desk marks one done here.
 */
export function useOccupiedRoomRequests(roomId: string | null) {
  const venueId = useHostWorkspace((s) => s.businessId);
  const [requests, setRequests] = useState<RoomRequestItem[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!roomId) return;
    const mine = ++seq.current;
    try {
      const res = await fetch(`/api/host/accommodations/rooms/${roomId}/requests`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      // An older read that lands after a newer one is dropped.
      if (mine === seq.current && res.ok && Array.isArray(data.requests)) setRequests(data.requests);
    } catch { /* the next ping or open reads again */ }
  }, [roomId]);

  useEffect(() => { setRequests(null); void load(); }, [load]);
  useFloorPing(roomId ? venueId : null, () => void load());

  const markDone = useCallback(async (id: string) => {
    setBusyId(id);
    setRequests((cur) => cur?.map((r) => (r.id === id ? { ...r, status: 'done' } : r)) ?? cur);
    try {
      await fetch('/api/host/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    } finally {
      setBusyId(null);
      void load();
    }
  }, [load]);

  return { requests, busyId, markDone };
}
