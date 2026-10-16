'use client';

import { useEffect, useRef, useState } from 'react';
import { subscribeFloor } from '@/lib/realtime/floor-ping';

/** A burst of pings (one order touches several tables) becomes one call. */
const COALESCE_MS = 250;

/**
 * Calls `onPing` when something changes at the venue, and says whether the push channel is up. While it is up a screen
 * only needs a slow safety read; while it is down it should fall back to reading often.
 * Pass null as the business to stay off (the owner's screens use database realtime instead).
 */
export function useFloorPing(businessId: string | null | undefined, onPing: () => void): boolean {
  const [connected, setConnected] = useState(false);
  const latest = useRef(onPing);
  latest.current = onPing;

  useEffect(() => {
    if (!businessId) { setConnected(false); return; }
    let timer: ReturnType<typeof setTimeout> | null = null;
    const off = subscribeFloor(businessId, {
      ping: () => {
        if (timer) return;
        timer = setTimeout(() => { timer = null; latest.current(); }, COALESCE_MS);
      },
      status: setConnected,
    });
    return () => {
      if (timer) clearTimeout(timer);
      off();
      setConnected(false);
    };
  }, [businessId]);

  return connected;
}

/** How often a screen re-reads as a safety net while the push channel is up. */
export const PUSH_HEARTBEAT_MS = 30_000;
