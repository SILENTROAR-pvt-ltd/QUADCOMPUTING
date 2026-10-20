'use client';

import React from 'react';
import { Clock, Moon } from 'lucide-react';
import { inr, istDateTime, plural } from '@/components/stay/stay-format';
import type { RoomState } from './useRoomStay';

/** The stay at a glance: who, which room, since when, and whether the kitchen is open now. */
export function RoomHeader({ data }: { data: RoomState }) {
  const { room, dining, folio } = data;
  const cover = room.category?.photos?.[0] || null;
  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-neutral-800 bg-neutral-900">
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element -- venue photos come from the venue's own storage
        <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent" />
      <div className="relative p-5 pt-16 sm:p-7 sm:pt-20">
        <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-amber-200/80">{room.category?.name || 'Your room'}</p>
        <h2 className="mt-1 font-serif text-4xl font-light text-white">
          {room.guest_first_name ? `Welcome, ${room.guest_first_name}` : `Room ${room.room_number}`}
        </h2>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-neutral-300">
          <span>Room {room.room_number}</span>
          {room.check_in_time && <span className="inline-flex items-center gap-1.5"><Moon className="h-3.5 w-3.5" /> Since {istDateTime(room.check_in_time)}</span>}
          {folio && <span>{plural(folio.nights, 'night')} so far · {inr(folio.total)} on your bill</span>}
        </div>
        <p className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${dining.open && dining.enabled ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100' : 'border-neutral-700 bg-neutral-950/60 text-neutral-300'}`}>
          <Clock className="h-3.5 w-3.5" /> {dining.enabled ? dining.message : 'In-room dining is not offered here'}
        </p>
      </div>
    </section>
  );
}
