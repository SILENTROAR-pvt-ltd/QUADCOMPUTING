'use client';

import React from 'react';
import { CalendarDays, Phone, Copy } from 'lucide-react';
import type { RoomCategory } from '@/types';
import { useStayBookings, type StayBooking } from './useStayBookings';

interface Props { categories: RoomCategory[]; onShowToast: (msg: string) => void }

const STATUS: Record<string, string> = {
  requested: 'bg-amber-50 text-amber-800 ring-amber-200', confirmed: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  checked_in: 'bg-neutral-900 text-white ring-neutral-900', declined: 'bg-neutral-100 text-neutral-600 ring-neutral-200',
  cancelled: 'bg-neutral-100 text-neutral-600 ring-neutral-200', no_show: 'bg-rose-50 text-rose-800 ring-rose-200',
};
const date = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const nights = (b: StayBooking) => Math.max(1, Math.round((Date.parse(b.check_out) - Date.parse(b.check_in)) / 86_400_000));
const btn = 'h-8 rounded-lg border border-neutral-200 bg-white px-3 text-[11px] font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50 cursor-pointer';

/** Advance bookings from the public showcase: who is coming, when, under which code; confirm, decline, or mark no-show. */
export function StayBookingsPanel({ categories, onShowToast }: Props) {
  const b = useStayBookings(onShowToast);
  const catName = (x: StayBooking) => x.category?.name || categories.find((c) => c.id === x.category_id)?.name || 'Room';
  const copy = (code: string) => { void navigator.clipboard.writeText(code); onShowToast(`Code ${code} copied.`); };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-600">Guests reserve from the public page and pay on arrival. At check-in, enter their booking code on the room's check-in form, or let them self check-in with it.</p>
        <div className="inline-grid grid-cols-2 gap-1 rounded-xl bg-neutral-100 p-1 text-xs">
          {(['upcoming', 'all'] as const).map((s) => (
            <button key={s} type="button" onClick={() => b.setScope(s)} className={`h-8 rounded-lg px-3 font-semibold capitalize cursor-pointer ${b.scope === s ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500'}`}>{s}</button>
          ))}
        </div>
      </div>
      {b.error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800">{b.error}</p>}
      {b.loading ? (
        <div className="h-40 animate-pulse rounded-2xl border border-neutral-200 bg-white" aria-busy="true" />
      ) : b.bookings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-neutral-300" />
          <p className="mt-3 font-serif text-lg text-neutral-900">No {b.scope === 'upcoming' ? 'upcoming ' : ''}bookings</p>
          <p className="mt-1 text-xs text-neutral-500">Share your stay page so guests can reserve: it is listed under Room setup.</p>
        </div>
      ) : (
        <ul className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          {b.bookings.map((x) => {
            const open = x.status === 'requested' || x.status === 'confirmed';
            return (
              <li key={x.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-neutral-950">{x.guest_name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${STATUS[x.status] || STATUS.cancelled}`}>{x.status.replace('_', ' ')}</span>
                    {x.confirmation_code && (
                      <button type="button" onClick={() => copy(x.confirmation_code!)} className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-1.5 py-0.5 font-mono text-[11px] text-neutral-800 hover:bg-neutral-200 cursor-pointer" title="Copy code">
                        {x.confirmation_code} <Copy className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-neutral-600">
                    {catName(x)} · {date(x.check_in)} → {date(x.check_out)} · {nights(x)} night{nights(x) === 1 ? '' : 's'} · {x.guests} guest{x.guests === 1 ? '' : 's'}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-neutral-500">
                    <a href={`tel:${x.guest_phone}`} className="inline-flex items-center gap-1 hover:text-neutral-900"><Phone className="h-3 w-3" />{x.guest_phone}</a>
                    {x.guest_email && <span>{x.guest_email}</span>}
                    {x.note && <span className="italic">“{x.note}”</span>}
                  </p>
                </div>
                {open && (
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {x.status === 'requested' && <button type="button" disabled={b.busyId === x.id} onClick={() => void b.act(x.id, 'confirm')} className={`${btn} border-emerald-200 text-emerald-800`}>Confirm</button>}
                    <button type="button" disabled={b.busyId === x.id} onClick={() => void b.act(x.id, 'no_show')} className={btn}>No-show</button>
                    <button type="button" disabled={b.busyId === x.id} onClick={() => void b.act(x.id, 'cancel')} className={`${btn} text-rose-700`}>Cancel</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
