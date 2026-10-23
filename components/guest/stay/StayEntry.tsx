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
      <div className="flex w-full items-center gap-2.5 rounded-[20px] bg-[#fbf9f4] py-2 pl-3 pr-2 shadow-[0_14px_30px_-26px_rgba(16,35,26,0.55)] ring-1 ring-[#e8dfcc]">
        <button type="button" onClick={() => setOpen(true)} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left active:scale-[0.99]">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0f2a1e] ${view.live ? 'text-[#f5f1e8] ring-2 ring-[#d9c193]' : 'text-[#d9c193]'}`}><BedDouble className="h-4 w-4" aria-hidden /></span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold text-[#10231a]">{view.title}</span>
            <span className="block truncate text-[11px] text-[#10231a]/55">{view.hint}</span>
          </span>
        </button>
        <Link href={view.action.href} className={`inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] px-3.5 text-xs font-semibold text-[#f5f1e8] ring-1 transition active:scale-95 ${view.live ? 'ring-[#d9c193]' : 'ring-[#d9c193]/30'}`}>
          <view.action.Icon className="h-3.5 w-3.5" aria-hidden /> {view.action.label}
        </Link>
      </div>
      {open && <StayHubSheet hub={data} cafeId={cafeId} onClose={() => setOpen(false)} />}
    </div>
  );
}
