'use client';

import React, { useEffect, useState } from 'react';
import { CalendarCheck, X } from 'lucide-react';
import type { PhysicalRoom } from '@/types';
import type { StayBooking } from '../bookings/useStayBookings';

interface Props { room: PhysicalRoom; booking: StayBooking | null; onPick: (b: StayBooking | null) => void }

const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** On a vacant room: guests who reserved can be picked here, so the form fills from the booking and the booking is closed by the check-in. */
export function BookingPicker({ room, booking, onPick }: Props) {
  const [open, setOpen] = useState<StayBooking[]>([]);
  useEffect(() => {
    let alive = true;
    void (async () => {
      const res = await fetch('/api/host/accommodations/bookings?scope=upcoming', { cache: 'no-store' }).catch(() => null);
      const data = res ? await res.json().catch(() => ({})) : {};
      if (alive && Array.isArray(data.bookings)) {
        // This room's type first, then by arrival.
        const rank = (b: StayBooking) => (b.category_id === room.category_id ? 0 : 1);
        setOpen([...data.bookings as StayBooking[]].sort((a, b) => rank(a) - rank(b) || a.check_in.localeCompare(b.check_in)));
      }
    })();
    return () => { alive = false; };
  }, [room.id, room.category_id]);

  if (booking) {
    const other = booking.category_id !== room.category_id;
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-900"><CalendarCheck className="h-4 w-4" /> Checking in with booking <span className="font-mono">{booking.confirmation_code}</span></p>
          <button type="button" onClick={() => onPick(null)} aria-label="Check in without this booking" className="rounded-md p-1 text-emerald-800 hover:bg-emerald-100 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-1 text-xs text-emerald-900/80">{booking.guest_name} · {booking.category?.name || 'Room'} · {day(booking.check_in)} → {day(booking.check_out)} · {booking.guests} guest{booking.guests === 1 ? '' : 's'}. Details are filled in below; the booking closes when you check in.</p>
        {other && <p className="mt-2 text-xs font-medium text-amber-800">Booked as {booking.category?.name || 'another type'}, but this room is {room.category?.name || 'a different type'}: the tariff below is for this room.</p>}
      </div>
    );
  }
  if (open.length === 0) return null;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Arriving with a booking?</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {open.slice(0, 8).map((b) => (
          <button key={b.id} type="button" onClick={() => onPick(b)}
            className={`rounded-xl border bg-white px-3 py-2 text-left text-xs transition hover:border-neutral-900 cursor-pointer ${b.category_id === room.category_id ? 'border-neutral-300' : 'border-neutral-200 opacity-75'}`}>
            <span className="block font-semibold text-neutral-900">{b.guest_name}</span>
            <span className="block font-mono text-[11px] text-neutral-500">{b.confirmation_code} · {day(b.check_in)} → {day(b.check_out)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
