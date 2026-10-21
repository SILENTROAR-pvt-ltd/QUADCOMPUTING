'use client';

import React from 'react';
import Link from 'next/link';
import { BedDouble, CalendarCheck, KeyRound, UtensilsCrossed } from 'lucide-react';
import { StayShell, stayButton } from '@/components/stay/StayShell';
import type { RoomState } from './useRoomStay';

const serif = { fontFamily: "'Playfair Display', Georgia, serif" };

/**
 * The room's QR scanned while no stay is checked in: a guest who just arrived, one whose desk check-in is still being
 * typed, or someone looking at an empty room. The page says so plainly and offers the three ways on: finish a booking's
 * check-in, reserve this room type, or simply see the menu. It keeps reading the room, so it comes alive the moment the
 * desk checks a guest in.
 */
export function RoomVacant({ data }: { data: RoomState }) {
  const { room, business } = data;
  const venue = encodeURIComponent(business.slug || business.id);
  const cover = room.category?.photos?.[0] || null;
  return (
    <StayShell eyebrow="Your room" title={`Room ${room.room_number} · ${business.name}`}>
      <section className="overflow-hidden rounded-[2rem] border border-[#e6d9b8] bg-white shadow-[0_24px_60px_-36px_rgba(10,50,34,0.5)]">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element -- venue photos come from the venue's own storage
          <img src={cover} alt="" className="h-40 w-full object-cover sm:h-56" decoding="async" />
        )}
        <div className="p-6 sm:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-700">{room.category?.name || 'Room'} · Room {room.room_number}</p>
          <h2 className="mt-2 text-3xl font-medium tracking-tight text-neutral-950" style={serif}>No stay is checked in here yet</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            Once the desk checks a guest in, this page becomes their room: food to the door, the bill, the front desk and check-out.
            Just checked in at the desk? Give it a moment; this page refreshes by itself.
          </p>
          <div className="mt-5 space-y-2.5">
            {business.self_checkin_enabled !== false && (
              <Link href={`/stay/${venue}/checkin`} className={`${stayButton.primary} w-full`}><KeyRound className="h-4 w-4" aria-hidden /> I have a booking · check in</Link>
            )}
            <Link href={`/stay/${venue}`} className={`${stayButton.ghost} w-full`}><CalendarCheck className="h-4 w-4" aria-hidden /> Reserve a room{room.category?.name ? ` · from ₹${Number(room.category.price || 0).toLocaleString('en-IN')} a night` : ''}</Link>
            <Link href={`/menu?cafe_id=${encodeURIComponent(business.id)}`} className={`${stayButton.ghost} w-full`}><UtensilsCrossed className="h-4 w-4" aria-hidden /> See the menu</Link>
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs text-neutral-500"><BedDouble className="h-3.5 w-3.5" aria-hidden /> Already checked in on another phone? Open your room from the Stay tab of the menu, with your room number and mobile digits.</p>
        </div>
      </section>
    </StayShell>
  );
}
