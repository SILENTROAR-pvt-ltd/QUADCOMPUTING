'use client';

import React, { useEffect } from 'react';
import { BadgeCheck, BedDouble, Phone, X } from 'lucide-react';
import { bookingNights, type RoomBookingAction, type StayBooking } from './useRoomReservations';
import { STAY_STATUS_LABEL, STAY_STATUS_STYLE, stayActions, stayDate } from './RoomReservationRow';

interface Props { booking: StayBooking; busy: boolean; onAct: (a: RoomBookingAction) => void; onClose: () => void; onOpenDesk: () => void }

const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }) : '—');

/** The whole room reservation in one sheet: the stay, the guest, the money, how it was made, and what to do next. */
export function RoomReservationSheet({ booking: b, busy, onAct, onClose, onOpenDesk }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const n = bookingNights(b);
  const rate = Number(b.category?.price) || 0;
  const arrival = b.expected_arrival === 'late' ? 'Arrives late' : b.expected_arrival?.startsWith('early:') ? 'Early check-in asked' : 'Standard arrival';
  const rows: Array<[string, React.ReactNode]> = [
    ['Stay', `${stayDate(b.check_in)} → ${stayDate(b.check_out)} · ${n} night${n === 1 ? '' : 's'}`],
    ['Room type', `${b.category?.name || 'Room'}${rate ? ` · ₹${rate.toLocaleString('en-IN')} a night` : ''}`],
    ['Guests', `${b.guests} ${b.guests === 1 ? 'guest' : 'guests'}`],
    ['Estimated stay', rate ? `₹${(rate * n).toLocaleString('en-IN')} before add-ons and GST` : '—'],
    ['Paid', b.pass ? <span className="inline-flex items-center gap-1 text-emerald-800"><BadgeCheck className="h-3.5 w-3.5" /> ₹{Number(b.pass.amount).toLocaleString('en-IN')} by {b.pass.payment_method} · {when(b.pass.paid_at)}{b.pass.status === 'used' ? ' · checked in with it' : ''}</span> : 'Not yet; taken at the desk'],
    ['Arrival', arrival],
    ['Booked', `${when(b.created_at)} · ${b.source === 'desk' ? 'at the desk' : 'by the guest online'}${b.confirmation_code ? ` · ${b.confirmation_code}` : ''}`],
    ['Note', b.note || '—'],
  ];
  const actions = stayActions(b);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-neutral-950/40 backdrop-blur-sm animate-in fade-in duration-150 sm:items-center sm:p-6">
      <div className="fixed inset-0" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Room reservation" className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-neutral-200 bg-white shadow-2xl sm:rounded-3xl">
        <header className="flex items-start justify-between gap-3 border-b border-neutral-100 px-6 py-4">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-800"><BedDouble className="h-3.5 w-3.5" aria-hidden /> Room reservation</p>
            <h2 className="mt-1 truncate font-serif text-2xl text-neutral-950">{b.guest_name}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-600">
              <a href={`tel:${b.guest_phone}`} className="inline-flex items-center gap-1 font-medium hover:text-neutral-950"><Phone className="h-3 w-3" />{b.guest_phone}</a>
              {b.guest_email && <span>{b.guest_email}</span>}
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STAY_STATUS_STYLE[b.status] || STAY_STATUS_STYLE.cancelled}`}>{STAY_STATUS_LABEL[b.status] || b.status}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200"><X className="h-4 w-4" /></button>
        </header>
        <dl className="flex-1 space-y-2.5 overflow-y-auto px-6 py-4 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[6.5rem_1fr] gap-3"><dt className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{k}</dt><dd className="min-w-0 text-neutral-900">{v}</dd></div>
          ))}
        </dl>
        <footer className="flex flex-wrap gap-2 border-t border-neutral-100 px-6 py-4">
          {actions.map((a) => (
            <button key={a.to} type="button" disabled={busy} onClick={() => onAct(a.to)}
              className={`h-10 cursor-pointer rounded-xl px-4 text-xs font-semibold disabled:opacity-40 ${a.tone === 'danger' ? 'border border-rose-200 text-rose-700 hover:bg-rose-50' : 'bg-neutral-950 text-white hover:bg-neutral-800'}`}>{a.label}</button>
          ))}
          <button type="button" onClick={onOpenDesk} className="ml-auto h-10 cursor-pointer rounded-xl border border-emerald-300 bg-emerald-50 px-4 text-xs font-semibold text-emerald-900 hover:bg-emerald-100">
            {b.pass ? 'Check in at the desk' : 'Take payment at the desk'}
          </button>
        </footer>
      </div>
    </div>
  );
}
