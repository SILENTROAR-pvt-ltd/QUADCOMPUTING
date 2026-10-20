'use client';

import React, { useState } from 'react';
import { Users, BedDouble } from 'lucide-react';
import { inr, plural, type StayType } from './stay-format';
import { stayButton } from './StayShell';

interface Props { type: StayType; nights: number; onBook: (type: StayType) => void }

/** One room type: photos, what comes with it, the rate, and whether it is free for the chosen nights. */
export function RoomTypeCard({ type, nights, onBook }: Props) {
  const [photo, setPhoto] = useState(0);
  const free = type.available_for_dates ?? type.vacant_now;
  const soldOut = free <= 0;
  const cover = type.photos[photo] || type.photos[0] || null;

  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-neutral-800 bg-neutral-900/60 transition hover:border-neutral-700">
      <div className="relative aspect-[16/10] bg-neutral-900">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- venue photos come from the venue's own storage
          <img src={cover} alt={type.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-700"><BedDouble className="h-10 w-10" /></div>
        )}
        {type.photos.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {type.photos.slice(0, 8).map((_, i) => (
              <button key={i} type="button" aria-label={`Photo ${i + 1}`} onClick={() => setPhoto(i)}
                className={`h-1.5 rounded-full transition-all ${i === photo ? 'w-5 bg-white' : 'w-1.5 bg-white/40'}`} />
            ))}
          </div>
        )}
        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${soldOut ? 'bg-neutral-950/80 text-neutral-400' : 'bg-emerald-500/90 text-neutral-950'}`}>
          {soldOut ? 'Fully booked' : `${free} free`}
        </span>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-serif text-2xl font-light text-white">{type.name}</h3>
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-neutral-400"><Users className="h-3.5 w-3.5" /> Sleeps {type.occupancy}</p>
          </div>
          <div className="text-right">
            <p className="font-serif text-2xl text-white">{inr(type.price)}</p>
            <p className="text-[10px] uppercase tracking-widest text-neutral-500">per night</p>
          </div>
        </div>

        {type.amenities.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {type.amenities.slice(0, 8).map((a) => (
              <li key={a} className="rounded-full border border-neutral-800 bg-neutral-950/60 px-2.5 py-1 text-[11px] text-neutral-300">{a}</li>
            ))}
          </ul>
        )}

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-neutral-800 pt-4">
          <p className="text-xs text-neutral-400">
            {plural(nights, 'night')} · <span className="text-neutral-200">{inr(type.price * nights)}</span>, pay on arrival
          </p>
          <button type="button" disabled={soldOut} onClick={() => onBook(type)} className={`${stayButton.primary} h-10 px-4 text-xs`}>
            {soldOut ? 'Unavailable' : 'Reserve'}
          </button>
        </div>
      </div>
    </article>
  );
}
