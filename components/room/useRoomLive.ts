'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { guestTableChannel } from '@/lib/realtime/channels';
import { roomTableLabel } from '@/lib/guest/room-mode';

/** A burst of changes (one order touches several rows) becomes one read. */
const COALESCE_MS = 300;

/**
 * The room page hears about its orders the way the menu does: the kitchen's ticket moves, the bill changes, the desk
 * settles, and the venue-scoped table channel for this room (the room's orders carry the label RS-<room>) gets an
 * empty ping. Every ping means the same thing: read the room now. A same-device host tab is heard too, and a page
 * that comes back to the front re-reads at once. Returns whether the push channel is up, so polling can slow down.
 */
export function useRoomLive(businessId: string | null, roomNumber: string | null, onChange: () => void): boolean {
  const [connected, setConnected] = useState(false);
  const latest = useRef(onChange);
  latest.current = onChange;

  useEffect(() => {
    if (!businessId || !roomNumber) return;
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const readSoon = () => {
      if (timer) return;
      timer = setTimeout(() => { timer = null; latest.current(); }, COALESCE_MS);
    };

    const topic = guestTableChannel(businessId, roomTableLabel(roomNumber));
    const channel = topic && supabase.channel(topic)
      .on('broadcast', { event: 'table_settled' }, readSoon)
      .on('broadcast', { event: 'order_status_updated' }, readSoon)
      .on('broadcast', { event: 'kot_status_update' }, readSoon)
      .on('broadcast', { event: 'changed' }, readSoon)
      .subscribe((status: string) => setConnected(status === 'SUBSCRIBED'));

    let bc: BroadcastChannel | null = null;
    try {
      if ('BroadcastChannel' in window) { bc = new BroadcastChannel('quad_kitchen_sync'); bc.onmessage = readSoon; }
    } catch { /* optional */ }
    const onVisible = () => { if (document.visibilityState === 'visible') readSoon(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', readSoon);

    return () => {
      if (timer) clearTimeout(timer);
      bc?.close();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', readSoon);
      if (channel) void supabase.removeChannel(channel);
      setConnected(false);
    };
  }, [businessId, roomNumber]);

  return connected;
}
