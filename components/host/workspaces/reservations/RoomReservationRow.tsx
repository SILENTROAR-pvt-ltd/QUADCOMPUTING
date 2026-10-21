'use client';

import React from 'react';
import { BadgeCheck, BedDouble, ChevronRight } from 'lucide-react';
import { bookingNights, type RoomBookingAction, type StayBooking } from './useRoomReservations';

export const STAY_STATUS_LABEL: Record<string, string> = {
  requested: 'Requested', confirmed: 'Confirmed', checked_in: 'In house', checked_out: 'Stayed',
  declined: 'Declined', cancelled: 'Cancelled', no_show: 'No-show',
};
export const STAY_STATUS_STYLE: Record<string, string> = {
  requested: 'bg-amber-50 text-amber-900 border-amber-200', confirmed: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  checked_in: 'bg-neutral-900 text-white border-neutral-900', checked_out: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  declined: 'bg-neutral-100 text-neutral-500 border-neutral-200', cancelled: 'bg-neutral-100 text-neutral-500 border-neutral-200',
  no_show: 'bg-rose-50 text-rose-800 border-rose-200',
};

/** What the host can do from here; a paid booking is cancelled from Accommodations, where the refund is handled. */
export function stayActions(b: StayBooking): Array<{ to: RoomBookingAction; label: string; tone?: 'danger' }> {
  if (b.status === 'requested') return [{ to: 'confirm', label: 'Confirm' }, ...(b.pass ? [] : [{ to: 'cancel' as const, label: 'Cancel', tone: 'danger' as const }])];
  if (b.status === 'confirmed' && !b.pass) return [{ to: 'no_show', label: 'No-show', tone: 'danger' }, { to: 'cancel', label: 'Cancel', tone: 'danger' }];
  return [];
}

export const stayDate = (iso: string) => new Date(`${iso}T00:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

interface Props { booking: StayBooking; busy: boolean; onAct: (a: RoomBookingAction) => void; onOpen: () => void }

/** One room reservation: the stay's dates and room type, who, paid or not, and the quick actions. Tap for the whole booking. */
export function RoomReservationRow({ booking: b, busy, onAct, onOpen }: Props) {
  const actions = stayActions(b);
  const n = bookingNights(b);
  return (
    <li className="grid gap-3 px-4 py-4 sm:grid-cols-[1.2fr_1fr_auto] sm:items-center sm:gap-4">
      <button type="button" onClick={onOpen} className="min-w-0 cursor-pointer text-left">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-neutral-950">
          <BedDouble className="h-3.5 w-3.5 text-emerald-700" aria-hidden />
          {stayDate(b.check_in)} → {stayDate(b.check_out)} <span className="font-normal text-neutral-500">· {n} night{n === 1 ? '' : 's'}</span>
        </p>
        <p className="mt-0.5 truncate text-xs text-neutral-600">
          {b.guest_name} · {b.guests} {b.guests === 1 ? 'guest' : 'guests'} · {b.category?.name || 'Room'}{b.confirmation_code ? ` · ${b.confirmation_code}` : ''}
        </p>
        {b.note && <p className="mt-1 text-xs text-neutral-500">Note: {b.note}</p>}
      </button>

      <div className="flex flex-wrap items-center gap-2 sm:justify-start">
        <a href={`tel:${b.guest_phone.replace(/\s/g, '')}`} className="text-xs font-medium text-neutral-700 underline-offset-2 hover:underline">{b.guest_phone}</a>
        <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STAY_STATUS_STYLE[b.status] || STAY_STATUS_STYLE.cancelled}`}>{STAY_STATUS_LABEL[b.status] || b.status}</span>
        {b.pass
          ? <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-900"><BadgeCheck className="h-3 w-3" /> Paid ₹{Number(b.pass.amount).toLocaleString('en-IN')}</span>
          : (b.status === 'requested' || b.status === 'confirmed') && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900">Not paid yet</span>}
      </div>

      <div className="flex flex-wrap gap-1.5 sm:justify-end">
        {actions.map((a) => (
          <button key={a.to} type="button" disabled={busy} onClick={() => onAct(a.to)}
            className={`h-9 cursor-pointer rounded-xl px-3 text-xs font-semibold transition-colors disabled:opacity-40 ${a.tone === 'danger' ? 'border border-rose-200 text-rose-700 hover:bg-rose-50' : 'bg-neutral-950 text-white hover:bg-neutral-800'}`}>
            {a.label}
          </button>
        ))}
        <button type="button" onClick={onOpen} className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-xl border border-neutral-200 px-3 text-xs font-semibold text-neutral-800 hover:bg-neutral-50">
          Details <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </li>
  );
}
