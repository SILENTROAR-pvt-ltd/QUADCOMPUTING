'use client';

import React, { useState } from 'react';
import { CalendarDays, CalendarPlus, Plus } from 'lucide-react';
import type { PhysicalRoom, RoomCategory } from '@/types';
import { useStayBookings, type StayBooking } from './useStayBookings';
import { useStaySettings } from './useStaySettings';
import { BookingRow } from './BookingRow';
import { CollectSheet } from './collect/CollectSheet';
import { ReserveSheet } from './ReserveSheet';
import type { CollectSpec } from './collect/useCollect';

interface Props {
  categories: RoomCategory[]; rooms: PhysicalRoom[]; onShowToast: (msg: string) => void;
  /** Bumped when a check-in elsewhere on the page closes a booking, so the list reloads. */
  refreshKey: number; onCheckIn: (booking: StayBooking, room: PhysicalRoom) => void;
  /** A booking was made or paid here: the front desk behind it should re-read (a room may now be held or paid). */
  onChanged: () => void;
}

/**
 * Advance bookings from the public showcase. The desk takes the room payment here (direct UPI, cash or card), which
 * issues the guest's self check-in link; or checks them in at the desk. A guest with no reservation starts from "New stay".
 */
export function StayBookingsPanel({ categories, rooms, onShowToast, refreshKey, onCheckIn, onChanged }: Props) {
  const b = useStayBookings(onShowToast, refreshKey);
  const { settings } = useStaySettings();
  const [collect, setCollect] = useState<CollectSpec | null>(null);
  const [reserving, setReserving] = useState(false);
  const catName = (x: StayBooking) => x.category?.name || categories.find((c) => c.id === x.category_id)?.name || 'Room';
  const copy = (code: string) => { void navigator.clipboard.writeText(code); onShowToast(`Code ${code} copied.`); };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-neutral-600">Reserving is free. When a guest arrives, tap <strong className="font-semibold text-neutral-900">Guest arrived</strong>: they check in on their phone after paying you directly, or you check them in at the desk with their ID.</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setReserving(true)} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-50"><CalendarPlus className="h-3.5 w-3.5" /> Reserve</button>
          <button type="button" onClick={() => setCollect({ kind: 'pass', booking: null })} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-neutral-950 px-3.5 text-xs font-semibold text-white hover:bg-neutral-800"><Plus className="h-3.5 w-3.5" /> New stay</button>
          <div className="inline-grid grid-cols-2 gap-1 rounded-xl bg-neutral-100 p-1 text-xs">
            {(['upcoming', 'all'] as const).map((s) => (
              <button key={s} type="button" onClick={() => b.setScope(s)} className={`h-8 rounded-lg px-3 font-semibold capitalize cursor-pointer ${b.scope === s ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500'}`}>{s}</button>
            ))}
          </div>
        </div>
      </div>
      {b.error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800">{b.error}</p>}
      {b.loading && b.bookings.length === 0 ? (
        <div className="h-40 animate-pulse rounded-2xl border border-neutral-200 bg-white" aria-busy="true" />
      ) : b.bookings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-neutral-300" />
          <p className="mt-3 font-serif text-lg text-neutral-900">No {b.scope === 'upcoming' ? 'upcoming ' : ''}bookings</p>
          <p className="mt-1 text-xs text-neutral-500">Share your stay page so guests can reserve: it is listed under Room setup.</p>
        </div>
      ) : (
        <ul className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          {b.bookings.map((x) => (
            <BookingRow key={x.id} booking={x} rooms={rooms} categoryName={catName(x)} busy={b.busyId === x.id} policies={settings?.stay_policies || null} selfEnabled={Boolean(settings?.self_checkin_enabled)}
              onAct={(id, a) => { void b.act(id, a).then(onChanged); }} onRefundCancel={(bk) => { void b.refundAndCancel(bk).then(onChanged); }} onCopy={copy} onCheckIn={onCheckIn}
              onCollect={(bk) => setCollect({ kind: 'pass', booking: bk })} onShowLink={(bk) => setCollect({ kind: 'pass', booking: bk, showLink: true })} />
          ))}
        </ul>
      )}
      {reserving && <ReserveSheet categories={categories} settings={settings} onClose={() => setReserving(false)} onReserved={(code, guest) => { setReserving(false); onShowToast(`Reserved for ${guest}. Code ${code}.`); void b.reload(); onChanged(); }} />}
      {collect && <CollectSheet spec={collect} categories={categories} settings={settings} onClose={() => setCollect(null)} onToast={onShowToast} onRecorded={() => { void b.reload(); onChanged(); }} />}
    </section>
  );
}
