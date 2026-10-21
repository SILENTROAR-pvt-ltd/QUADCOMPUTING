'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BedDouble, UtensilsCrossed, KeyRound, CalendarCheck, ChevronRight } from 'lucide-react';
import { inr, shortDate } from '@/components/stay/stay-format';
import { roomMenuHref } from '@/lib/guest/room-mode';
import { useStayHub } from './useStayHub';
import { StayHubSheet } from './StayHubSheet';

/**
 * The menu's Stay tile, for a venue with rooms: the guest's room if this phone is confirmed in one, their next reservation
 * if they have one, otherwise the rooms on offer. The text opens the one sheet where everything about staying lives; the
 * button on the right does the next thing directly: order to the room, check in, or reserve.
 */
export function StayEntry({ cafeId }: { cafeId: string }) {
  const { data } = useStayHub(cafeId);
  const [open, setOpen] = useState(false);
  if (!data?.venue.has_rooms) return null;

  const venue = encodeURIComponent(data.venue.slug || data.venue.id);
  const next = data.stays.find((s) => s.state === 'in_house' || s.state === 'upcoming');
  const room = data.my_room;
  const view = room
    ? { title: `Your room · ${room.room_number}`, hint: 'Order to your room, services and your bill', live: true,
        action: data.venue.in_room_dining_enabled
          ? { href: roomMenuHref(cafeId, room.code, room.room_number), label: 'Order to room', Icon: UtensilsCrossed }
          : { href: `/room/${encodeURIComponent(room.code)}`, label: 'My room', Icon: BedDouble } }
    : next
      ? { title: `Your stay · ${next.code || next.room_type || 'reserved'}`, hint: next.state === 'in_house' ? 'You are checked in' : `From ${shortDate(next.check_in)} · check in when you arrive`, live: false,
          action: next.state === 'upcoming' && data.venue.self_checkin_enabled ? { href: `/stay/${venue}/checkin`, label: 'Check in', Icon: KeyRound } : { href: `/stay/${venue}`, label: 'View', Icon: ChevronRight } }
      : { title: 'Stay with us', hint: `${data.venue.from_price ? `Rooms from ${inr(data.venue.from_price)}` : 'Rooms here'} · ${data.venue.free_now} free right now · reserve for free`, live: false,
          action: { href: `/stay/${venue}`, label: 'Reserve', Icon: CalendarCheck } };

  return (
    <div className="col-span-2">
      <div className="flex w-full items-center gap-2.5 rounded-2xl bg-white py-2 pl-3 pr-2 shadow-[0_1px_3px_rgba(0,0,0,0.08)] ring-1 ring-zinc-200/70">
        <button type="button" onClick={() => setOpen(true)} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left active:scale-[0.99]">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${view.live ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-900'}`}><BedDouble className="h-4 w-4" aria-hidden /></span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold text-zinc-900">{view.title}</span>
            <span className="block truncate text-[11px] text-zinc-500">{view.hint}</span>
          </span>
        </button>
        <Link href={view.action.href} className={`inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition active:scale-95 ${view.live ? 'bg-emerald-700 text-white hover:bg-emerald-800' : 'bg-zinc-950 text-white hover:bg-zinc-800'}`}>
          <view.action.Icon className="h-3.5 w-3.5" aria-hidden /> {view.action.label}
        </Link>
      </div>
      {open && <StayHubSheet hub={data} cafeId={cafeId} onClose={() => setOpen(false)} />}
    </div>
  );
}
