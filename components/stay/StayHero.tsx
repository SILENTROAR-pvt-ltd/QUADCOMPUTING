'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Phone, KeyRound, Clock, ArrowDown, BedDouble, ShieldCheck, Wallet, Smartphone, UtensilsCrossed } from 'lucide-react';
import { roomMenuHref } from '@/lib/guest/room-mode';
import type { MyRoom } from '@/lib/services/stay/stay-hub.service';
import { LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';
import s from '@/components/guest/luxe/luxe-guest.module.css';
import type { StayVenue } from './stay-format';
import { stayButton } from './StayShell';
import { StayFindRoom } from './StayFindRoom';

interface Props { venue: StayVenue; venueParam: string; coverPhoto: string | null; roomsCount: number; myRoom?: MyRoom | null }

const chip = 'inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#e8dfcc] bg-[#f8f4ea] px-3 py-1.5 text-[12px] text-[#10231a]/75';
const half = `${stayButton.ghost} w-full !px-3`;

const PROMISES = [
  { icon: ShieldCheck, title: 'Free to reserve', hint: 'Confirmed at once, no card needed' },
  { icon: Wallet, title: 'Pay at the desk', hint: 'UPI, cash or card when you arrive' },
  { icon: Smartphone, title: 'Check in from your phone', hint: 'Your link opens once the desk confirms' },
];

/**
 * The venue's opening, set like the arch cards of the home page: its photo settling under a curved edge with the name
 * centred over it, where it is and how to call beneath, one clear way to reserve with the other ways in beside each
 * other, and the three promises.
 */
export function StayHero({ venue, venueParam, coverPhoto, roomsCount, myRoom = null }: Props) {
  const times = venue.checkin_time || venue.checkout_time;
  return (
    <section className="overflow-hidden rounded-[2rem] border border-[#e8dfcc] bg-[#fbf9f4] shadow-[0_30px_60px_-40px_rgba(15,42,30,0.7)]">
      <div className="relative isolate h-[23rem] overflow-hidden bg-[radial-gradient(circle_at_30%_20%,#1d4632,#0f2a1e)] [border-radius:0_0_50%_50%/0_0_11%_11%] sm:h-[27rem]">
        {coverPhoto && (
          // eslint-disable-next-line @next/next/no-img-element -- venue photos come from the venue's own storage
          <img src={coverPhoto} alt="" decoding="async" fetchPriority="high" className={`${s.kenburns} absolute inset-0 -z-10 h-full w-full object-cover`} />
        )}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(8,22,15,0.5)_0%,rgba(8,22,15,0.1)_38%,rgba(8,22,15,0.9)_100%)]" />
        {times && (
          <span className="absolute left-1/2 top-4 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#f5f1e8]/90 px-3 py-1.5 text-[11px] font-medium text-[#10231a] shadow-sm">
            <Clock className="h-3.5 w-3.5 text-[#8a6d3f]" aria-hidden /> In {venue.checkin_time || '14:00'} · Out {venue.checkout_time || '11:00'}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 px-6 pb-12 text-center text-[#f5f1e8] sm:pb-14">
          <p className={`${s.enter} inline-flex items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#d9c193] before:h-px before:w-6 before:bg-[#d9c193]/70 after:h-px after:w-6 after:bg-[#d9c193]/70`}>Rooms &amp; stays</p>
          <h2 className={`${s.enter} mt-2 text-[2.8rem] font-light leading-[1.02] [text-wrap:balance] sm:text-[3.6rem]`} style={{ ...LUXE_SERIF, ['--d' as string]: '0.12s' }}>{venue.name}</h2>
          {venue.tagline && <p className={`${s.enter} mx-auto mt-2 max-w-md text-[17px] italic leading-snug text-[#f5f1e8]/80 [text-wrap:balance]`} style={{ ...LUXE_SERIF, ['--d' as string]: '0.24s' }}>{venue.tagline}</p>}
        </div>
      </div>

      <div className="px-5 pb-5 pt-4 sm:px-10">
        {(venue.address || venue.phones[0]) && (
          <div className="flex flex-wrap justify-center gap-2">
            {venue.address && <span className={chip}><MapPin className="h-3.5 w-3.5 shrink-0 text-[#8a6d3f]" aria-hidden /><span className="truncate">{venue.address}</span></span>}
            {venue.phones[0] && <a href={`tel:${venue.phones[0]}`} className={chip}><Phone className="h-3.5 w-3.5 shrink-0 text-[#8a6d3f]" aria-hidden />{venue.phones[0]}</a>}
          </div>
        )}
        <div className="mx-auto mt-4 grid max-w-md grid-cols-2 gap-2.5">
          {myRoom ? (
            // Checked in on this phone: the way in is the room, not the booking form.
            <>
              <Link href={`/room/${encodeURIComponent(myRoom.code)}`} className={`${stayButton.live} col-span-2 w-full`}><BedDouble className="h-4 w-4" aria-hidden /> My room · {myRoom.room_number}</Link>
              {venue.in_room_dining_enabled && (
                <Link href={roomMenuHref(venue.id, myRoom.code, myRoom.room_number)} className={`${half} col-span-2`}><UtensilsCrossed className="h-4 w-4" aria-hidden /> Order to room</Link>
              )}
            </>
          ) : (
            <>
              {roomsCount > 0 && <a href="#rooms" className={`${stayButton.primary} col-span-2 w-full`}>Reserve a room <ArrowDown className="h-4 w-4" aria-hidden /></a>}
              {venue.self_checkin_enabled && (
                <Link href={`/stay/${encodeURIComponent(venueParam)}/checkin`} className={half}><KeyRound className="h-4 w-4 shrink-0" aria-hidden /> I have a booking</Link>
              )}
              {/* Already checked in, but not signed in on this phone: room number + mobile digits open the room page. */}
              <StayFindRoom venueId={venue.id} className={venue.self_checkin_enabled ? half : `${half} col-span-2`} />
            </>
          )}
        </div>
      </div>

      <ul className="grid grid-cols-1 divide-y divide-[#e8dfcc] border-t border-[#e8dfcc] bg-[#f8f4ea] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {PROMISES.map(({ icon: Icon, title, hint }) => (
          <li key={title} className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#0f2a1e] text-[#d9c193]"><Icon className="h-4 w-4" aria-hidden /></span>
            <span className="min-w-0"><span className="block text-[13px] font-semibold text-[#10231a]">{title}</span><span className="block truncate text-[11.5px] text-[#10231a]/55">{hint}</span></span>
          </li>
        ))}
      </ul>
    </section>
  );
}
