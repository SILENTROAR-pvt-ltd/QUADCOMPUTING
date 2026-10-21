'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Phone, KeyRound, Clock, ArrowDown, BedDouble, ShieldCheck, Wallet, Smartphone, UtensilsCrossed } from 'lucide-react';
import { roomMenuHref } from '@/lib/guest/room-mode';
import type { MyRoom } from '@/lib/services/stay/stay-hub.service';
import type { StayVenue } from './stay-format';
import { stayButton } from './StayShell';
import { StayFindRoom } from './StayFindRoom';

interface Props { venue: StayVenue; venueParam: string; coverPhoto: string | null; roomsCount: number; myRoom?: MyRoom | null }

const serif = { fontFamily: "'Playfair Display', Georgia, serif" };
const chip = 'inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#e6d9b8] bg-white/90 px-3 py-1.5 text-xs text-neutral-700 shadow-[0_6px_16px_-12px_rgba(10,50,34,0.5)]';

const PROMISES = [
  { icon: ShieldCheck, title: 'Free to reserve', hint: 'Confirmed at once, no card needed' },
  { icon: Wallet, title: 'Pay at the desk', hint: 'UPI, cash or card when you arrive' },
  { icon: Smartphone, title: 'Check in from your phone', hint: 'Your link opens once the desk confirms' },
];

/** The venue's opening: its photo, name and tagline, where it is, the two ways in, and the three promises every stay keeps. */
export function StayHero({ venue, venueParam, coverPhoto, roomsCount, myRoom = null }: Props) {
  const times = venue.checkin_time || venue.checkout_time;
  return (
    <section className="overflow-hidden rounded-[2rem] border border-[#e6d9b8] bg-white shadow-[0_24px_60px_-36px_rgba(10,50,34,0.5)]">
      <div className="relative h-56 bg-neutral-100 sm:h-[21rem]">
        {coverPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element -- venue photos come from the venue's own storage
          <img src={coverPhoto} alt="" decoding="async" fetchPriority="high" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-neutral-300"><BedDouble className="h-12 w-12" aria-hidden /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/35 to-transparent" />
        {times && (
          <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-medium text-neutral-800 shadow-sm backdrop-blur">
            <Clock className="h-3.5 w-3.5 text-neutral-500" aria-hidden /> In {venue.checkin_time || '14:00'} · Out {venue.checkout_time || '11:00'}
          </span>
        )}
      </div>

      <div className="relative -mt-14 px-5 pb-6 sm:-mt-20 sm:px-10 sm:pb-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-700">Rooms &amp; stays</p>
        <h2 className="mt-2 text-4xl font-semibold leading-[1.05] tracking-tight text-neutral-950 [text-wrap:balance] sm:text-[3.25rem]" style={serif}>{venue.name}</h2>
        {venue.tagline && <p className="mt-3 max-w-xl text-[15px] italic leading-relaxed text-neutral-600 [text-wrap:balance]" style={serif}>{venue.tagline}</p>}

        <div className="mt-5 flex flex-wrap gap-2">
          {venue.address && <span className={chip}><MapPin className="h-3.5 w-3.5 shrink-0 text-neutral-500" aria-hidden /><span className="truncate">{venue.address}</span></span>}
          {venue.phones[0] && <a href={`tel:${venue.phones[0]}`} className={`${chip} hover:border-neutral-900`}><Phone className="h-3.5 w-3.5 shrink-0 text-neutral-500" aria-hidden />{venue.phones[0]}</a>}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          {myRoom ? (
            // Checked in on this phone: the way in is the room, not the booking form.
            <>
              <Link href={`/room/${encodeURIComponent(myRoom.code)}`} className={stayButton.live}><BedDouble className="h-4 w-4" aria-hidden /> My room · {myRoom.room_number}</Link>
              {venue.in_room_dining_enabled && (
                <Link href={roomMenuHref(venue.id, myRoom.code, myRoom.room_number)} className={stayButton.ghost}><UtensilsCrossed className="h-4 w-4" aria-hidden /> Order to room</Link>
              )}
            </>
          ) : (
            <>
              {roomsCount > 0 && (
                <a href="#rooms" className={stayButton.primary}>Reserve a room <ArrowDown className="h-4 w-4" aria-hidden /></a>
              )}
              {venue.self_checkin_enabled && (
                <Link href={`/stay/${encodeURIComponent(venueParam)}/checkin`} className={stayButton.ghost}><KeyRound className="h-4 w-4" aria-hidden /> I have a booking</Link>
              )}
              {/* Already checked in, but not signed in on this phone: room number + mobile digits open the room page. */}
              <StayFindRoom venueId={venue.id} />
            </>
          )}
        </div>
      </div>

      <ul className="grid grid-cols-1 divide-y divide-[#e6d9b8]/70 border-t border-[#e6d9b8]/70 bg-[#faf9f6]/70 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {PROMISES.map(({ icon: Icon, title, hint }) => (
          <li key={title} className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"><Icon className="h-4 w-4" aria-hidden /></span>
            <span className="min-w-0"><span className="block text-[13px] font-semibold text-neutral-950">{title}</span><span className="block truncate text-[11.5px] text-neutral-500">{hint}</span></span>
          </li>
        ))}
      </ul>
    </section>
  );
}
