'use client';

import React, { useState } from 'react';
import { BedDouble, UtensilsCrossed } from 'lucide-react';
import { useReservations, type ReservationFilter } from './useReservations';
import { ReservationRow } from './ReservationRow';
import { useRoomReservations } from './useRoomReservations';
import { RoomReservationRow } from './RoomReservationRow';
import { RoomReservationSheet } from './RoomReservationSheet';

const FILTERS: Array<{ id: ReservationFilter; label: string }> = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'all', label: 'All' },
];
type Kind = 'tables' | 'rooms';

/**
 * Every reservation the venue holds, tables and rooms apart: a table booked for an evening, and a room booked for a
 * stay, each with its own list, counts, quick actions and a full-detail sheet. Rooms are checked in and paid for from
 * the Accommodations desk; the button on a room's sheet goes there.
 */
export function ReservationsWorkspace({ onNavigate }: { onNavigate?: (tab: string) => void } = {}) {
  const [filter, setFilter] = useState<ReservationFilter>('upcoming');
  const [kind, setKind] = useState<Kind>('tables');
  const [openId, setOpenId] = useState<string | null>(null);
  const tables = useReservations(filter);
  const rooms = useRoomReservations(filter);
  const tablesWaiting = tables.items.filter((r) => r.status === 'requested').length;
  const roomsWaiting = rooms.items.filter((b) => b.status === 'requested').length;
  const open = openId ? rooms.items.find((b) => b.id === openId) || null : null;

  const seg = (id: Kind, label: string, Icon: typeof BedDouble, count: number, waiting: number) => (
    <button type="button" role="tab" aria-selected={kind === id} onClick={() => setKind(id)}
      className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl px-4 text-sm font-semibold ${kind === id ? 'bg-white text-neutral-950 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}>
      <Icon className={`h-4 w-4 ${id === 'rooms' ? 'text-emerald-700' : 'text-sky-700'}`} aria-hidden /> {label}
      <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-700">{count}</span>
      {waiting > 0 && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-900">{waiting} new</span>}
    </button>
  );

  return (
    <div className="space-y-5 pb-24 text-neutral-900 animate-in fade-in duration-300">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-neutral-950">Reservations</h1>
          <p className="mt-1 text-sm text-neutral-500">Tables booked for your opening hours, and rooms booked for a stay. Hours and the reservations switch live in My profile; room rates in Accommodations.</p>
        </div>
        {tablesWaiting + roomsWaiting > 0 && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">{tablesWaiting + roomsWaiting} waiting to confirm</span>
        )}
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Reservation kind" className="inline-flex gap-1 rounded-2xl bg-neutral-100 p-1">
          {seg('tables', 'Tables', UtensilsCrossed, tables.items.length, tablesWaiting)}
          {seg('rooms', 'Rooms', BedDouble, rooms.items.length, roomsWaiting)}
        </div>
        <div role="tablist" aria-label="Reservation view" className="inline-flex gap-1 rounded-2xl bg-neutral-100 p-1">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)}
              className={`h-10 cursor-pointer rounded-xl px-4 text-sm font-semibold ${filter === f.id ? 'bg-white text-neutral-950 shadow-sm' : 'text-neutral-500'}`}>{f.label}</button>
          ))}
        </div>
      </div>

      {kind === 'tables' && tables.error && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{tables.error}</p>}
      {kind === 'rooms' && rooms.error && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{rooms.error}</p>}

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        {kind === 'tables' ? (
          tables.loading ? <div className="shimmer m-4 h-24 rounded-xl" /> : tables.items.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-neutral-500">{filter === 'upcoming' ? 'No upcoming table reservations. New requests appear here straight away.' : 'No table reservations yet.'}</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {tables.items.map((r) => <ReservationRow key={r.id} reservation={r} busy={tables.busyId === r.id} onSet={(s) => void tables.setStatus(r.id, s)} />)}
            </ul>
          )
        ) : (
          rooms.loading ? <div className="shimmer m-4 h-24 rounded-xl" /> : rooms.items.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-neutral-500">{filter === 'upcoming' ? 'No upcoming room reservations. Bookings from the stay page and the desk appear here.' : 'No room reservations yet.'}</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {rooms.items.map((b) => <RoomReservationRow key={b.id} booking={b} busy={rooms.busyId === b.id} onAct={(a) => void rooms.act(b.id, a)} onOpen={() => setOpenId(b.id)} />)}
            </ul>
          )
        )}
      </div>

      {open && (
        <RoomReservationSheet booking={open} busy={rooms.busyId === open.id} onAct={(a) => void rooms.act(open.id, a)} onClose={() => setOpenId(null)}
          onOpenDesk={() => { setOpenId(null); onNavigate?.('accommodations'); }} />
      )}
    </div>
  );
}
