'use client';

import React from 'react';
import { BadgeCheck, CalendarClock, Moon, Sunrise } from 'lucide-react';
import type { PhysicalRoom } from '@/types';
import { arrivalLabel, upcomingArrivals } from '@/lib/services/stay/reservation-overlay';
import { todayIst } from '@/components/stay/stay-format';
import type { Reservation } from '../hooks/useAccommodationsData';

interface Props { reservations: Reservation[]; rooms: PhysicalRoom[]; onOpenRoom: (room: PhysicalRoom) => void; onOpenBookings: () => void }

/**
 * The reserved side of the front desk: who is expected in the next three days, which free room is being held for each guest
 * due now, and whether they have paid. A tap on a held guest opens that room's check-in with the booking filled in.
 */
export function ArrivalsStrip({ reservations, rooms, onOpenRoom, onOpenBookings }: Props) {
  const today = todayIst();
  const arrivals = upcomingArrivals(reservations, today, 3);
  if (arrivals.length === 0) return null;
  const heldRoom = (id: string) => rooms.find((r) => r.reserved_for?.id === id);

  return (
    <section aria-label="Expected arrivals" className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-violet-900"><CalendarClock className="h-4 w-4" /> Expected arrivals · {arrivals.length}</h3>
        <button type="button" onClick={onOpenBookings} className="cursor-pointer text-[11px] font-semibold text-violet-900 underline underline-offset-2 hover:text-violet-700">All bookings</button>
      </div>
      <ul className="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {arrivals.slice(0, 6).map((b) => {
          const room = heldRoom(b.id);
          const early = b.expected_arrival?.startsWith('early:');
          return (
            <li key={b.id}>
              <button type="button" disabled={!room} onClick={() => room && onOpenRoom(room)}
                className="flex w-full cursor-pointer flex-col gap-1.5 rounded-xl border border-violet-100 bg-white p-3 text-left transition hover:border-violet-300 disabled:cursor-default disabled:hover:border-violet-100">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-neutral-950">{b.guest_name}</span>
                  <span className="shrink-0 rounded-md bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-violet-800">{arrivalLabel(b.check_in, today)}</span>
                </span>
                <span className="text-xs text-neutral-600">{b.category?.name || 'Room'} · {b.guests} guest{b.guests === 1 ? '' : 's'}{room ? <> · holding <span className="font-mono font-semibold text-neutral-900">{room.room_number}</span></> : ''}</span>
                <span className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
                  {b.pass ? <span className="inline-flex items-center gap-1 text-emerald-800"><BadgeCheck className="h-3 w-3" /> Paid ₹{Number(b.pass.amount).toLocaleString('en-IN')}</span> : <span className="text-amber-800">Not paid yet</span>}
                  {b.expected_arrival === 'late' && <span className="inline-flex items-center gap-1 text-indigo-800"><Moon className="h-3 w-3" /> Arrives late</span>}
                  {early && <span className="inline-flex items-center gap-1 text-sky-800"><Sunrise className="h-3 w-3" /> Early check-in</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
