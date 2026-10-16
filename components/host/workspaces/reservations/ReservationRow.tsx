'use client';

import React from 'react';
import type { HostReservation, ReservationStatus } from './useReservations';

const STATUS_LABEL: Record<ReservationStatus, string> = {
  requested: 'Requested',
  confirmed: 'Confirmed',
  seated: 'Seated',
  cancelled: 'Cancelled',
  no_show: 'No-show',
};

const STATUS_STYLE: Record<ReservationStatus, string> = {
  requested: 'bg-amber-50 text-amber-900 border-amber-200',
  confirmed: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  seated: 'bg-neutral-900 text-white border-neutral-900',
  cancelled: 'bg-neutral-100 text-neutral-500 border-neutral-200',
  no_show: 'bg-rose-50 text-rose-800 border-rose-200',
};

/** The actions a host can take from each status. Terminal statuses have none. */
const ACTIONS: Record<ReservationStatus, Array<{ to: ReservationStatus; label: string; tone?: 'danger' }>> = {
  requested: [{ to: 'confirmed', label: 'Confirm' }, { to: 'cancelled', label: 'Cancel', tone: 'danger' }],
  confirmed: [{ to: 'seated', label: 'Seated' }, { to: 'no_show', label: 'No-show', tone: 'danger' }, { to: 'cancelled', label: 'Cancel', tone: 'danger' }],
  seated: [],
  cancelled: [],
  no_show: [],
};

const timeLabel = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(2000, 0, 1, h, m);
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const dateLabel = (iso: string) =>
  new Date(`${iso}T00:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

interface Props {
  reservation: HostReservation;
  busy: boolean;
  onSet: (status: ReservationStatus) => void;
}

export function ReservationRow({ reservation: r, busy, onSet }: Props) {
  const actions = ACTIONS[r.status];
  return (
    <li className="grid gap-3 px-4 py-4 sm:grid-cols-[1.2fr_1fr_auto] sm:items-center sm:gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-neutral-950">{timeLabel(r.reservedTime)} · {dateLabel(r.reservedDate)}</p>
        <p className="mt-0.5 truncate text-xs text-neutral-600">
          {r.guestName} · {r.partySize} {r.partySize === 1 ? 'guest' : 'guests'} · Table {r.tableNumber}
        </p>
        {r.notes && <p className="mt-1 text-xs text-neutral-500">Note: {r.notes}</p>}
      </div>

      <div className="flex items-center gap-2 sm:justify-start">
        <a href={`tel:${r.guestPhone.replace(/\s/g, '')}`} className="text-xs font-medium text-neutral-700 underline-offset-2 hover:underline">{r.guestPhone}</a>
        <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
      </div>

      {actions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 sm:justify-end">
          {actions.map((a) => (
            <button key={a.to} type="button" disabled={busy} onClick={() => onSet(a.to)}
              className={`h-9 cursor-pointer rounded-xl px-3 text-xs font-semibold transition-colors disabled:opacity-40 ${
                a.tone === 'danger' ? 'border border-rose-200 text-rose-700 hover:bg-rose-50' : 'bg-neutral-950 text-white hover:bg-neutral-800'
              }`}>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}
