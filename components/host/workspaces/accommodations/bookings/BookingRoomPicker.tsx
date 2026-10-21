'use client';

import React from 'react';
import type { PhysicalRoom } from '@/types';
import type { StayBooking } from './useStayBookings';

interface Props { booking: StayBooking; rooms: PhysicalRoom[]; categoryName: string; onPick: (room: PhysicalRoom) => void; onCancel: () => void }

const chip = 'rounded-lg border bg-white px-3 py-2 text-left text-xs transition hover:border-neutral-900 cursor-pointer';
const price = (r: PhysicalRoom) => `₹${Number(r.category?.price || 0).toLocaleString('en-IN')}`;

/** Under a booking: the free rooms to put the guest in. The booked type comes first; other types are offered, not hidden. */
export function BookingRoomPicker({ booking, rooms, categoryName, onPick, onCancel }: Props) {
  const free = rooms.filter((r) => r.status === 'VACANT').sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true }));
  const same = free.filter((r) => r.category_id === booking.category_id);
  const others = free.filter((r) => r.category_id !== booking.category_id);

  return (
    <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50/70 p-3.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Choose a room for {booking.guest_name}</p>
        <button type="button" onClick={onCancel} className="text-[11px] font-semibold text-neutral-500 underline underline-offset-2 hover:text-neutral-900 cursor-pointer">Cancel</button>
      </div>
      {same.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {same.map((r) => <button key={r.id} type="button" onClick={() => onPick(r)} className={`${chip} border-neutral-300`}><span className="block font-mono font-bold text-neutral-950">{r.room_number}</span><span className="block text-[10px] text-neutral-500">{categoryName}</span></button>)}
        </div>
      ) : (
        <p className="mt-2.5 text-xs text-amber-800">No {categoryName} room is free right now{others.length ? '. Another type can be used:' : ', and no other room is free either.'}</p>
      )}
      {others.length > 0 && (
        <div className={`flex flex-wrap gap-2 ${same.length ? 'mt-3 border-t border-neutral-200 pt-3' : 'mt-2.5'}`}>
          {same.length > 0 && <p className="w-full text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Other types (tariff differs)</p>}
          {others.map((r) => <button key={r.id} type="button" onClick={() => onPick(r)} className={`${chip} border-neutral-200`}><span className="block font-mono font-bold text-neutral-950">{r.room_number}</span><span className="block text-[10px] text-neutral-500">{r.category?.name || 'Room'} · {price(r)}</span></button>)}
        </div>
      )}
    </div>
  );
}
