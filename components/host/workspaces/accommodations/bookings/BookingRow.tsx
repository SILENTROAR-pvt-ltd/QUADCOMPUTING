'use client';

import React, { useState } from 'react';
import { Phone, Copy, BadgeCheck, Moon, Sunrise } from 'lucide-react';
import type { PhysicalRoom } from '@/types';
import type { StayPolicies } from '@/lib/services/stay/stay-policy';
import type { StayBooking } from './useStayBookings';
import { BookingRoomPicker } from './BookingRoomPicker';
import { BookingActions } from './BookingActions';

interface Props {
  booking: StayBooking; rooms: PhysicalRoom[]; categoryName: string; busy: boolean; policies: StayPolicies | null;
  onAct: (id: string, action: 'confirm' | 'decline' | 'cancel' | 'no_show') => void; onRefundCancel: (b: StayBooking) => void;
  onCopy: (code: string) => void; onCheckIn: (b: StayBooking, room: PhysicalRoom) => void; onCollect: (b: StayBooking) => void; onShowLink: (b: StayBooking) => void;
}

const STATUS: Record<string, string> = {
  requested: 'bg-amber-50 text-amber-800 ring-amber-200', confirmed: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  checked_in: 'bg-neutral-900 text-white ring-neutral-900', checked_out: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  declined: 'bg-neutral-100 text-neutral-600 ring-neutral-200',
  cancelled: 'bg-neutral-100 text-neutral-600 ring-neutral-200', no_show: 'bg-rose-50 text-rose-800 ring-rose-200',
};
const date = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const nights = (b: StayBooking) => Math.max(1, Math.round((Date.parse(b.check_out) - Date.parse(b.check_in)) / 86_400_000));
const chip = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset';

/** One reservation: who, when, under which code, whether the room is paid, how they said they would arrive, and what the desk can do. */
export function BookingRow({ booking: x, rooms, categoryName, busy, policies, onAct, onRefundCancel, onCopy, onCheckIn, onCollect, onShowLink }: Props) {
  const [choosing, setChoosing] = useState(false);
  const open = x.status === 'requested' || x.status === 'confirmed';
  const room = x.room_id ? rooms.find((r) => r.id === x.room_id) : null;
  const earlyId = x.expected_arrival?.startsWith('early:') ? x.expected_arrival.slice(6) : null;
  const early = earlyId ? policies?.early_checkin.find((o) => o.id === earlyId) : null;

  return (
    <li className="p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-neutral-950">{x.guest_name}</p>
            <span className={`${chip} uppercase tracking-wide ${STATUS[x.status] || STATUS.cancelled}`}>{x.status.replace('_', ' ')}</span>
            {x.confirmation_code && (
              <button type="button" onClick={() => onCopy(x.confirmation_code!)} className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-1.5 py-0.5 font-mono text-[11px] text-neutral-800 hover:bg-neutral-200 cursor-pointer" title="Copy code">
                {x.confirmation_code} <Copy className="h-3 w-3" />
              </button>
            )}
            {x.pass && <span className={`${chip} bg-emerald-50 text-emerald-800 ring-emerald-200`}><BadgeCheck className="h-3 w-3" /> Paid ₹{x.pass.amount.toLocaleString('en-IN')} · {x.pass.payment_method.toLowerCase()}</span>}
            {open && x.expected_arrival === 'late' && <span className={`${chip} bg-indigo-50 text-indigo-800 ring-indigo-200`}><Moon className="h-3 w-3" /> Arrives late</span>}
            {open && earlyId && <span className={`${chip} bg-sky-50 text-sky-800 ring-sky-200`}><Sunrise className="h-3 w-3" /> {early?.label || 'Early check-in'}</span>}
          </div>
          <p className="mt-1 text-xs text-neutral-600">
            {categoryName} · {date(x.check_in)} → {date(x.check_out)} · {nights(x)} night{nights(x) === 1 ? '' : 's'} · {x.guests} guest{x.guests === 1 ? '' : 's'}
            {x.status === 'checked_in' && room && <> · in room <span className="font-mono font-semibold text-neutral-900">{room.room_number}</span></>}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-neutral-500">
            <a href={`tel:${x.guest_phone}`} className="inline-flex items-center gap-1 hover:text-neutral-900"><Phone className="h-3 w-3" />{x.guest_phone}</a>
            {x.guest_email && <span>{x.guest_email}</span>}
            {x.note && <span className="italic">“{x.note}”</span>}
          </p>
        </div>
        {open && (
          <BookingActions booking={x} busy={busy} choosing={choosing} onToggleChoose={() => setChoosing((c) => !c)} onCollect={() => onCollect(x)} onShowLink={() => onShowLink(x)}
            onConfirm={() => onAct(x.id, 'confirm')} onNoShow={() => onAct(x.id, 'no_show')} onCancel={() => onAct(x.id, 'cancel')} onRefundCancel={() => onRefundCancel(x)} />
        )}
      </div>
      {open && choosing && <BookingRoomPicker booking={x} rooms={rooms} categoryName={categoryName} onPick={(r) => { setChoosing(false); onCheckIn(x, r); }} onCancel={() => setChoosing(false)} />}
    </li>
  );
}
