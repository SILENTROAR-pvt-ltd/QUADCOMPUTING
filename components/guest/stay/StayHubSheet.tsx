'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BedDouble, CalendarCheck, KeyRound, Search, UtensilsCrossed, ArrowRight } from 'lucide-react';
import { BottomSheet } from '@/components/guest/shared/BottomSheet';
import { SheetHeader } from '@/components/guest/shared/SheetHeader';
import { roomMenuHref } from '@/lib/guest/room-mode';
import { inr } from '@/components/stay/stay-format';
import { RoomLookupForm } from '@/components/guest/room/RoomLookupForm';
import { StayBookingRow } from './StayBookingRow';
import type { StayHub } from './useStayHub';

const ROW = 'flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left transition hover:border-zinc-900';
const ICON = 'grid h-9 w-9 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-900';

/** Everything about staying here, in one sheet: the guest's room now, their reservations, and the ways in. */
export function StayHubSheet({ hub, cafeId, onClose }: { hub: StayHub; cafeId: string; onClose: () => void }) {
  const router = useRouter();
  const [lookup, setLookup] = useState(false);
  const venue = hub.venue.slug || hub.venue.id;
  const stayHref = `/stay/${encodeURIComponent(venue)}`;
  const roomHref = hub.my_room ? `/room/${encodeURIComponent(hub.my_room.code)}` : null;

  return (
    <BottomSheet labelledBy="stay-hub-title" onClose={onClose}>
      <SheetHeader id="stay-hub-title" icon={<BedDouble className="h-[18px] w-[18px]" />} title={`Stay at ${hub.venue.name}`} onClose={onClose}
        subtitle={hub.my_room ? `You are in Room ${hub.my_room.room_number}.` : hub.venue.from_price ? `Rooms from ${inr(hub.venue.from_price)} a night · ${hub.venue.free_now} free right now.` : 'Reserve, check in and order to your room.'} />
      <div className="mt-5 space-y-4">
        {hub.my_room && roomHref && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-800">Your room</p>
            <p className="mt-1 text-lg font-semibold text-neutral-950" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Room {hub.my_room.room_number}{hub.my_room.room_type ? ` · ${hub.my_room.room_type}` : ''}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href={roomHref} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-neutral-950 text-xs font-semibold text-white"><BedDouble className="h-4 w-4" aria-hidden /> My room</Link>
              {hub.venue.in_room_dining_enabled && <Link href={roomMenuHref(cafeId, hub.my_room.code, hub.my_room.room_number)} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-emerald-300 bg-white text-xs font-semibold text-emerald-900"><UtensilsCrossed className="h-4 w-4" aria-hidden /> Order to room</Link>}
            </div>
          </div>
        )}

        {hub.stays.length > 0 && (
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Your reservations</p>
            <ul className="divide-y divide-zinc-100">{hub.stays.map((s) => <StayBookingRow key={s.id} stay={s} roomHref={roomHref} />)}</ul>
          </section>
        )}

        <div className="space-y-2">
          <Link href={stayHref} className={ROW}><span className={ICON}><CalendarCheck className="h-4 w-4" aria-hidden /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-zinc-950">Reserve a room</span><span className="block text-xs text-zinc-500">Free, confirmed at once; pay at the desk when you arrive</span></span><ArrowRight className="h-4 w-4 text-zinc-400" aria-hidden /></Link>
          {hub.venue.self_checkin_enabled && <Link href={`${stayHref}/checkin`} className={ROW}><span className={ICON}><KeyRound className="h-4 w-4" aria-hidden /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-zinc-950">I have a booking</span><span className="block text-xs text-zinc-500">Paid at the desk? Check in from your phone</span></span><ArrowRight className="h-4 w-4 text-zinc-400" aria-hidden /></Link>}
          {!hub.my_room && (
            <button type="button" onClick={() => setLookup((v) => !v)} className={ROW} aria-expanded={lookup}><span className={ICON}><Search className="h-4 w-4" aria-hidden /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-zinc-950">Find my room</span><span className="block text-xs text-zinc-500">Already checked in on another phone? Room number and your mobile digits</span></span></button>
          )}
          {lookup && !hub.my_room && <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"><RoomLookupForm cafeId={cafeId} onFound={(r) => router.push(`/room/${encodeURIComponent(r.code)}`)} /></div>}
        </div>
        {!hub.signed_in && <p className="text-center text-[11px] text-zinc-400">Sign in with your Vibers ID to see your reservations here and on every phone.</p>}
      </div>
    </BottomSheet>
  );
}
