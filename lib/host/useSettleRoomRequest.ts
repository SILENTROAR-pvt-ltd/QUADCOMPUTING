'use client';

import { useEffect, useRef } from 'react';
import { SETTLE_ROOM_EVENT, takeSettleRoomRequest, type SettleRoomRequest } from './open-room-request';

/**
 * The till answers the desk's "check out & bill": the room handed over before this workspace mounted is taken on mount,
 * a later one arrives as an event. `open` loads the folio and opens the bill for checkout.
 */
export function useSettleRoomRequest(open: (room: SettleRoomRequest) => void) {
  const latest = useRef(open);
  latest.current = open;
  useEffect(() => {
    const waiting = takeSettleRoomRequest();
    if (waiting) latest.current(waiting);
    const onEvent = (e: Event) => {
      takeSettleRoomRequest();
      const room = (e as CustomEvent<SettleRoomRequest>).detail;
      if (room?.id) latest.current(room);
    };
    window.addEventListener(SETTLE_ROOM_EVENT, onEvent);
    return () => window.removeEventListener(SETTLE_ROOM_EVENT, onEvent);
  }, []);
}
