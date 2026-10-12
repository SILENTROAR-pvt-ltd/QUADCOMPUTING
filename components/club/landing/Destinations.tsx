import React from 'react';
import { CLUB_DISPLAY } from '../fonts';
import { DESTINATIONS, photoUrl, type Photo } from '../photos';

const PICKS: Array<{ photo: Photo; span: string; note: string }> = [
  { photo: DESTINATIONS.ladakh, span: 'sm:col-span-2 sm:row-span-2', note: 'Road trips at altitude' },
  { photo: DESTINATIONS.kerala, span: '', note: 'Slow days on the water' },
  { photo: DESTINATIONS.jaipur, span: '', note: 'Old cities, late chai' },
  { photo: DESTINATIONS.santorini, span: '', note: 'Island hopping' },
  { photo: DESTINATIONS.halong, span: '', note: 'Limestone and lanterns' },
  { photo: DESTINATIONS.cappadocia, span: 'sm:col-span-2', note: 'Sunrise from a balloon' },
  { photo: DESTINATIONS.mumbai, span: '', note: 'Sea face evenings' },
  { photo: DESTINATIONS.bali, span: '', note: 'Temples and rice terraces' },
];

/** "Where members are heading": a gallery of destinations, each photo easing in on hover. */
export function Destinations() {
  return (
    <section aria-labelledby="where-title" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-[#3c6b2b]">Select destination</p>
          <h2 id="where-title" className={`${CLUB_DISPLAY} mt-3 text-[40px] font-semibold leading-[1.05] tracking-tight sm:text-6xl`}>Where members are <em className="font-medium text-[#3c6b2b]">heading</em></h2>
        </div>
        <p className="max-w-sm text-sm text-[#14261b]/70">From the Himalaya to the Aegean: plans are hosted by verified members and joined by people who want the same trip.</p>
      </div>
      <div className="mt-10 grid auto-rows-[220px] grid-cols-1 gap-4 sm:grid-cols-4">
        {PICKS.map(({ photo, span, note }) => (
          <figure key={photo.id} className={`group relative overflow-hidden rounded-[30px] bg-[#dfe7d5] ${span}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl(photo.id, 1100)} alt={`${photo.place}, ${photo.country}`} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition duration-[1200ms] ease-out group-hover:scale-110" />
            <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
            <figcaption className="absolute inset-x-5 bottom-5 text-white">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/85">{photo.country}</span>
              <span className={`${CLUB_DISPLAY} block text-2xl font-semibold leading-tight`}>{photo.place}</span>
              <span className="text-xs text-[#e2ee9a]">{note}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
