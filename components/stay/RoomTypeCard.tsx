'use client';

import React, { useState } from 'react';
import { Users, BedDouble, ArrowRight, Check } from 'lucide-react';
import { LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';
import s from '@/components/guest/luxe/luxe-guest.module.css';
import { inr, plural, type StayType } from './stay-format';
import { stayButton } from './StayShell';

interface Props { type: StayType; nights: number; onBook: (type: StayType) => void }

/**
 * One room type, set like a hotel's own page: the photograph under a curved edge with the name over it and dots to move
 * between photos, what comes with the room, and the rate per night with Reserve. The menu's room cards open it by its id.
 */
export function RoomTypeCard({ type, nights, onBook }: Props) {
  const [photo, setPhoto] = useState(0);
  const free = type.available_for_dates ?? type.vacant_now;
  const soldOut = free <= 0;
  const cover = type.photos[photo] || type.photos[0] || null;
  const shown = type.amenities.slice(0, 6);
  const more = type.amenities.length - shown.length;

  return (
    <article id={`room-${type.id}`} className="group flex scroll-mt-24 flex-col overflow-hidden rounded-[30px] border border-[#e8dfcc] bg-[#fbf9f4] shadow-[0_26px_50px_-36px_rgba(15,42,30,0.6)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-[radial-gradient(circle_at_30%_20%,#1d4632,#0f2a1e)] [border-radius:0_0_50%_50%/0_0_12%_12%]">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- venue photos come from the venue's own storage
          <img key={cover} src={cover} alt={type.name} loading="lazy" decoding="async" className={`${s.slowmo} h-full w-full object-cover`} />
        ) : (
          <div className="grid h-full w-full place-items-center text-[#d9c193]"><BedDouble className="h-10 w-10" aria-hidden /></div>
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,22,15,0.6)_0%,transparent_38%,rgba(8,22,15,0.75)_100%)]" />
        <div className="absolute inset-x-0 top-0 p-5 text-[#f5f1e8]">
          <h3 className="text-[2rem] font-medium leading-[1.02] [text-wrap:balance]" style={LUXE_SERIF}>{type.name}</h3>
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] text-[#f5f1e8]/85"><Users className="h-3.5 w-3.5 text-[#d9c193]" aria-hidden /> Sleeps {type.occupancy}</p>
        </div>
        <span className="absolute bottom-9 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#08160f]/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f5f1e8] ring-1 ring-white/15">
          {!soldOut && <span aria-hidden className={`${s.pulse} h-1.5 w-1.5 rounded-full bg-[#d9c193]`} />}
          {soldOut ? 'Fully booked' : `${free} free for your dates`}
        </span>
        {type.photos.length > 1 && (
          <div className="absolute bottom-3.5 left-0 right-0 flex justify-center gap-1.5">
            {type.photos.slice(0, 8).map((_, i) => (
              <button key={i} type="button" aria-label={`Photo ${i + 1}`} aria-pressed={i === photo} onClick={() => setPhoto(i)}
                className={`h-1.5 cursor-pointer rounded-full transition-all ${i === photo ? 'w-5 bg-[#f5f1e8]' : 'w-1.5 bg-[#f5f1e8]/50 hover:bg-[#f5f1e8]/80'}`} />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        {shown.length > 0 && (
          <>
            <p className="text-[1.3rem] font-medium text-[#10231a]" style={LUXE_SERIF}>Popular amenities</p>
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {shown.map((a) => (
                <li key={a} className="inline-flex items-center gap-1 rounded-full border border-[#e8dfcc] bg-[#f8f4ea] px-3 py-1.5 text-[11.5px] text-[#10231a]/80"><Check className="h-3 w-3 text-[#8a6d3f]" aria-hidden />{a}</li>
              ))}
              {more > 0 && <li className="rounded-full px-2 py-1.5 text-[11.5px] text-[#8a6d3f]">+{more} more</li>}
            </ul>
          </>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#e8dfcc] pt-4" style={{ marginTop: shown.length ? '1.25rem' : 'auto' }}>
          <p className="leading-tight text-[#10231a]">
            <span className="text-[1.8rem] font-medium" style={LUXE_SERIF}>{inr(type.price)}</span><span className="ml-1 text-[12px] text-[#10231a]/55">/ night</span>
            <span className="block text-[11px] text-[#10231a]/50">{plural(nights, 'night')} · {inr(type.price * nights)} · paid at the desk</span>
          </p>
          <button type="button" disabled={soldOut} onClick={() => onBook(type)} className={stayButton.primary}>
            {soldOut ? 'Unavailable' : <>Reserve <ArrowRight className="h-4 w-4" aria-hidden /></>}
          </button>
        </div>
      </div>
    </article>
  );
}
