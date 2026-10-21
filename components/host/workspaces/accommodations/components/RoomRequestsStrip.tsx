'use client';

import React from 'react';
import { ChevronRight, HandCoins, LogOut } from 'lucide-react';
import type { PhysicalRoom } from '@/types';

const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true }) : '');

/**
 * Guests waiting on the desk, at the top of the front desk until answered: a tap opens the room's box with the action
 * ready. Unlike the bell, this does not go away on its own; it leaves when the request is acted on or dismissed.
 */
export function RoomRequestsStrip({ rooms, onOpenRoom }: { rooms: PhysicalRoom[]; onOpenRoom: (room: PhysicalRoom) => void }) {
  const waiting = rooms.filter((r) => r.status === 'OCCUPIED' && r.checkout_request?.status === 'pending')
    .sort((a, b) => String(a.checkout_request?.requested_at).localeCompare(String(b.checkout_request?.requested_at)));
  if (waiting.length === 0) return null;

  return (
    <section aria-label="Guests waiting on the desk" className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 ring-4 ring-emerald-500/10">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-900">Waiting on the desk · {waiting.length}</h3>
      <ul className="mt-2.5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {waiting.map((room) => {
          const paying = room.checkout_request?.kind === 'bill';
          const Icon = paying ? HandCoins : LogOut;
          return (
            <li key={room.id}>
              <button type="button" onClick={() => onOpenRoom(room)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-emerald-200 bg-white p-3 text-left transition hover:border-emerald-600 hover:shadow-md">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-600 text-white"><Icon className="h-4 w-4" aria-hidden /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-neutral-950">Room {room.room_number} · {paying ? 'wants to pay now' : 'ready to check out'}</span>
                  <span className="block truncate text-xs text-neutral-600">{room.guest_name || 'Guest'} · asked {when(room.checkout_request?.requested_at)}{room.checkout_request?.note ? ` · “${room.checkout_request.note}”` : ''}</span>
                </span>
                <span className="shrink-0 text-xs font-semibold text-emerald-800">{paying ? 'Take payment' : 'Settle'}<ChevronRight className="ml-0.5 inline h-3.5 w-3.5" aria-hidden /></span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
