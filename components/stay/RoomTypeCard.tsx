'use client';

import React, { useState } from 'react';
import { Users, BedDouble, ArrowRight, Check } from 'lucide-react';
import { inr, plural, type StayType } from './stay-format';
import { stayButton } from './StayShell';

interface Props { type: StayType; nights: number; onBook: (type: StayType) => void }

const serif = { fontFamily: "'Playfair Display', Georgia, serif" };

/** One room type: photos, what comes with it, the rate, and whether it is free for the chosen nights. */
export function RoomTypeCard({ type, nights, onBook }: Props) {
  const [photo, setPhoto] = useState(0);
  const free = type.available_for_dates ?? type.vacant_now;
  const soldOut = free <= 0;
  const cover = type.photos[photo] || type.photos[0] || null;
  const shown = type.amenities.slice(0, 6);
  const more = type.amenities.length - shown.length;

  return (
    <article className="group flex flex-col overflow-hidden rounded-[1.75rem] border border-[#e6d9b8] bg-white shadow-[0_18px_40px_-34px_rgba(10,50,34,0.5)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-30px_rgba(10,50,34,0.5)]">
      <div className="relative aspect-[16/10] bg-neutral-100">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- venue photos come from the venue's own storage
          <img src={cover} alt={type.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" />
        ) : (
          <div className="grid h-full w-full place-items-center text-neutral-300"><BedDouble className="h-10 w-10" aria-hidden /></div>
        )}
        {type.photos.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {type.photos.slice(0, 8).map((_, i) => (
              <button key={i} type="button" aria-label={`Photo ${i + 1}`} aria-pressed={i === photo} onClick={() => setPhoto(i)}
                className={`h-1.5 cursor-pointer rounded-full transition-all ${i === photo ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'}`} />
            ))}
          </div>
        )}
        <span className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider shadow-sm backdrop-blur ${soldOut ? 'bg-white/90 text-neutral-500' : 'bg-white/90 text-emerald-800'}`}>
          {!soldOut && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_1px_rgba(16,185,129,0.6)]" />}
          {soldOut ? 'Fully booked' : `${free} free for your dates`}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-2xl font-medium text-neutral-950" style={serif}>{type.name}</h3>
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-neutral-500"><Users className="h-3.5 w-3.5" aria-hidden /> Sleeps {type.occupancy}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl text-neutral-950" style={serif}>{inr(type.price)}</p>
            <p className="text-[10px] uppercase tracking-widest text-neutral-500">per night</p>
          </div>
        </div>

        {shown.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {shown.map((a) => (
              <li key={a} className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-[#faf9f6] px-2.5 py-1 text-[11px] text-neutral-700"><Check className="h-3 w-3 text-emerald-600" aria-hidden />{a}</li>
            ))}
            {more > 0 && <li className="rounded-full px-2 py-1 text-[11px] text-neutral-400">+{more} more</li>}
          </ul>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-neutral-200/80 pt-4" style={{ marginTop: shown.length ? '1.25rem' : 'auto' }}>
          <p className="text-xs text-neutral-500">
            {plural(nights, 'night')} · <span className="font-semibold text-neutral-900">{inr(type.price * nights)}</span>
            <span className="block text-[11px] text-neutral-400">paid at the desk · free to reserve</span>
          </p>
          <button type="button" disabled={soldOut} onClick={() => onBook(type)} className={stayButton.primarySm}>
            {soldOut ? 'Unavailable' : <>Reserve <ArrowRight className="h-3.5 w-3.5" aria-hidden /></>}
          </button>
        </div>
      </div>
    </article>
  );
}
