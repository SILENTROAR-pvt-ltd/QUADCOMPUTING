'use client';

import React, { useState } from 'react';
import { useReservations, type ReservationFilter } from './useReservations';
import { ReservationRow } from './ReservationRow';

const FILTERS: Array<{ id: ReservationFilter; label: string }> = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'all', label: 'All' },
];

/** Table bookings: requests from guests, confirmed and seated tables, and no-shows. */
export function ReservationsWorkspace() {
  const [filter, setFilter] = useState<ReservationFilter>('upcoming');
  const { items, loading, error, busyId, setStatus } = useReservations(filter);
  const requested = items.filter((r) => r.status === 'requested').length;

  return (
    <div className="space-y-5 pb-24 text-neutral-900 animate-in fade-in duration-300">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-neutral-950">Reservations</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Table bookings for your opening hours. Set the hours and the reservations switch in My profile.
          </p>
        </div>
        {requested > 0 && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">{requested} waiting to confirm</span>
        )}
      </header>

      <div role="tablist" aria-label="Reservation view" className="inline-flex gap-1 rounded-2xl bg-neutral-100 p-1">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)}
            className={`h-10 cursor-pointer rounded-xl px-4 text-sm font-semibold ${filter === f.id ? 'bg-white text-neutral-950 shadow-sm' : 'text-neutral-500'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        {loading ? (
          <div className="shimmer m-4 h-24 rounded-xl" />
        ) : items.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-neutral-500">
            {filter === 'upcoming' ? 'No upcoming reservations. New requests appear here straight away.' : 'No reservations yet.'}
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {items.map((r) => (
              <ReservationRow key={r.id} reservation={r} busy={busyId === r.id} onSet={(s) => void setStatus(r.id, s)} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
