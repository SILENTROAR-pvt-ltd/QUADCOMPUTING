'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { readRoomMenuSeed, type RoomMenuSeed } from '@/lib/guest/menu-seed';
import { useClientSeed } from '@/lib/guest/use-client-seed';

export type RoomModeInfo = RoomMenuSeed;

/**
 * The menu in room mode: confirms the room's stay is live and this browser is confirmed as the guest's (otherwise it
 * sends them to the room page, which asks for the last four digits of the phone), and reads the kitchen's hours. A guest
 * who came from the room page arrives with that already known (the page left it in sessionStorage), so the menu shows
 * at once and the check runs behind it; the order itself is checked again by the server when it is placed.
 */
export function useRoomMode(roomCode: string) {
  const router = useRouter();
  const seed = useClientSeed(roomCode || null, readRoomMenuSeed);
  const [fresh, setInfo] = useState<RoomModeInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const info = fresh ?? seed;

  useEffect(() => {
    if (!roomCode) return;
    let alive = true;
    void (async () => {
      // The light view: the room, the venue and the kitchen hours; not the bill, which the menu does not show.
      const res = await fetch(`/api/guest/room/${encodeURIComponent(roomCode)}?view=menu`, { cache: 'no-store' }).catch(() => null);
      const data = res ? await res.json().catch(() => ({})) : {};
      if (!alive) return;
      if (!res?.ok || !data.success) { setError(data?.error || 'This room link is not valid.'); return; }
      // The stay is over (checked out) or this phone is not confirmed in it: the room page says which, and what to do
      // next (the bill and cashback in Me, or the phone-digits check). A menu that cannot serve the room is no place to stop.
      if (!data.occupied || !data.verified) { router.replace(`/room/${encodeURIComponent(roomCode)}`); return; }
      setInfo({ roomNumber: data.room.room_number, venueName: data.business.name, dining: { enabled: data.dining.enabled, open: data.dining.open, message: data.dining.message } });
    })();
    return () => { alive = false; };
  }, [roomCode, router]);

  return { roomMode: Boolean(roomCode), info, error };
}
