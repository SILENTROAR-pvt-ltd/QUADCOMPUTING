'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Phone, KeyRound } from 'lucide-react';
import type { StayVenue } from './stay-format';
import { stayButton } from './StayShell';

interface Props { venue: StayVenue; venueParam: string; coverPhoto: string | null }

/** The venue's opening: name, tagline, where it is, and the way in for a guest who is already standing there. */
export function StayHero({ venue, venueParam, coverPhoto }: Props) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-neutral-800 bg-neutral-900">
      {coverPhoto && (
        // eslint-disable-next-line @next/next/no-img-element -- venue photos come from the venue's own storage
        <img src={coverPhoto} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/70 to-transparent" />
      <div className="relative px-6 pb-7 pt-24 sm:px-10 sm:pt-32">
        <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-amber-200/80">Stay</p>
        <h2 className="mt-2 font-serif text-4xl font-light leading-tight text-white sm:text-5xl">{venue.name}</h2>
        {venue.tagline && <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-300">{venue.tagline}</p>}
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-neutral-400">
          {venue.address && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{venue.address}</span>}
          {venue.phones[0] && <a href={`tel:${venue.phones[0]}`} className="inline-flex items-center gap-1.5 hover:text-white"><Phone className="h-3.5 w-3.5" />{venue.phones[0]}</a>}
          {(venue.checkin_time || venue.checkout_time) && (
            <span>Check-in {venue.checkin_time || '14:00'} · Check-out {venue.checkout_time || '11:00'}</span>
          )}
        </div>
        {venue.self_checkin_enabled && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href={`/stay/${encodeURIComponent(venueParam)}/checkin`} className={stayButton.primary}>
              <KeyRound className="mr-2 h-4 w-4" /> Self check-in now
            </Link>
            <span className="text-xs text-neutral-400">Already here? Check in from your phone in two minutes.</span>
          </div>
        )}
      </div>
    </section>
  );
}
