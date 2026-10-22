'use client';

import { useEffect, useRef, useState } from 'react';
import { subscribeFloor, type TicketStage } from '@/lib/realtime/floor-ping';

/**
 * A burst of pings becomes one call. The rows one order touches (order, lines, ticket, session, table) are committed
 * together, so their pings land within a few milliseconds of each other; 80 ms gathers them without the wait being felt.
 */
const COALESCE_MS = 80;

/**
 * Calls `onPing` when something changes at the venue, and says whether the push channel is up. While it is up a screen
 * only needs a slow safety read; while it is down it should fall back to reading often.
 * `onTicket` runs at once, with no gathering, when a ping names a kitchen ticket's new stage (so the card moves before the
 * confirming read). Pass null as the business to stay off (the owner's screens use database realtime instead).
 */
export function useFloorPing(
  businessId: string | null | undefined,
  onPing: () => void,
  onTicket?: (ticket: TicketStage) => void,
): boolean {
  const [connected, setConnected] = useState(false);
  const latest = useRef(onPing);
  latest.current = onPing;
  const latestTicket = useRef(onTicket);
  latestTicket.current = onTicket;

  useEffect(() => {
    if (!businessId) { setConnected(false); return; }
    let timer: ReturnType<typeof setTimeout> | null = null;
    const off = subscribeFloor(businessId, {
      ping: (ticket) => {
        if (ticket) latestTicket.current?.(ticket);
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
