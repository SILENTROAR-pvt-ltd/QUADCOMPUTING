'use client';

import React from 'react';
import Link from 'next/link';
import { BedDouble, Clock, ArrowLeft } from 'lucide-react';
import type { RoomModeInfo } from '@/components/guest/room/useRoomMode';

/**
 * On the menu in room mode: where the food is going, what it costs the guest now (nothing: it is added to the room bill),
 * the kitchen's hours, and the way back. Two rows, so a phone never squeezes the words into a thin column.
 */
export function RoomModeBar({ info, roomCode }: { info: RoomModeInfo; roomCode: string }) {
  const open = info.dining.enabled && info.dining.open;
  return (
    <div className="mx-auto mt-1 w-full max-w-3xl px-4">
      <div className="rounded-2xl border border-[#e6d9b8] bg-white px-4 py-3.5 shadow-[0_6px_16px_-12px_rgba(10,50,34,0.5)]">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-zinc-950 text-white"><BedDouble className="h-4 w-4" aria-hidden /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-zinc-950">Room delivery · Room {info.roomNumber}</p>
            <p className="mt-0.5 text-[12px] leading-snug text-zinc-500">Brought to your door. Food and drinks are added to your room bill, paid at checkout.</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${open ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-amber-50 text-amber-800 ring-amber-200'}`}>
            <Clock className="h-3 w-3" aria-hidden /> {info.dining.enabled ? info.dining.message : 'Room dining is off'}
          </span>
          <Link href={`/room/${encodeURIComponent(roomCode)}`} className="inline-flex items-center gap-1 text-[12px] font-semibold text-zinc-700 hover:text-zinc-950"><ArrowLeft className="h-3.5 w-3.5" aria-hidden /> My room</Link>
        </div>
      </div>
    </div>
  );
}
