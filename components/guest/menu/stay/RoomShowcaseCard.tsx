'use client';

import React, { useEffect, useState } from 'react';
import { ArrowUpRight, BedDouble, MapPin, Users } from 'lucide-react';
import { LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';
import s from '@/components/guest/luxe/luxe-guest.module.css';

export interface RoomCardData {
  id: string;
  name: string;
  photos: string[];
  price: number | null;
  sleeps?: number | null;
  free?: number | null;
  perks?: string[];
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const GLASS = 'inline-flex items-center gap-1.5 rounded-full bg-[#08160f]/55 px-2.5 py-1 text-[11px] font-semibold text-[#f5f1e8] ring-1 ring-white/15';

/**
 * One room as a tall photograph: the name in the house serif over the picture, where it is, the photos dissolving slowly
 * one into the next, and glass chips for the rate, who it sleeps and what is free tonight.
 */
export function RoomShowcaseCard({ room, place, onOpen }: { room: RoomCardData; place: string; onOpen: () => void }) {
  const [shown, setShown] = useState(0);
  const photos = room.photos.slice(0, 5);

  useEffect(() => {
    if (photos.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setShown((i) => (i + 1) % photos.length), 4800);
    return () => clearInterval(t);
  }, [photos.length]);

  return (
    <article onClick={onOpen} className="group relative isolate cursor-pointer overflow-hidden rounded-[28px] bg-[#0f2a1e] shadow-[0_30px_60px_-36px_rgba(15,42,30,0.85)] ring-1 ring-[#e8dfcc] transition-transform duration-500 active:scale-[0.985]">
      <div className="relative aspect-[4/5]">
        {photos.length ? photos.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- the venue's own room photo
          <img key={src} src={src} alt={i === shown ? room.name : ''} loading="lazy" decoding="async"
            className={`absolute inset-0 -z-10 h-full w-full object-cover transition-opacity duration-[1400ms] ${i === shown ? `opacity-100 ${s.slowmo}` : 'opacity-0'}`} />
        )) : (
          <span aria-hidden className="absolute inset-0 -z-10 grid place-items-center bg-[radial-gradient(circle_at_30%_20%,#1d4632,#0f2a1e)] text-[#d9c193]"><BedDouble className="h-10 w-10" /></span>
        )}
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(8,22,15,0.7)_0%,rgba(8,22,15,0.1)_32%,rgba(8,22,15,0.1)_62%,rgba(8,22,15,0.85)_100%)]" />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
          <div className="min-w-0 text-[#f5f1e8]">
            <h3 className="text-[1.9rem] font-medium leading-[1.02] [text-wrap:balance]" style={LUXE_SERIF}>{room.name}</h3>
            <p className="mt-1.5 flex items-center gap-1.5 truncate text-[11.5px] text-[#f5f1e8]/80"><MapPin className="h-3.5 w-3.5 shrink-0 text-[#d9c193]" aria-hidden />{place}</p>
          </div>
          <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f5f1e8]/90 text-[#0f2a1e] shadow-md transition-transform duration-500 group-hover:rotate-45"><ArrowUpRight className="h-4 w-4" /></span>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4">
          {photos.length > 1 && (
            <div aria-hidden className="mb-3 flex justify-center gap-1.5">
              {photos.map((src, i) => <span key={src} className={`h-1.5 rounded-full transition-all duration-500 ${i === shown ? 'w-5 bg-[#f5f1e8]' : 'w-1.5 bg-[#f5f1e8]/45'}`} />)}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {room.price ? <span className={GLASS}>{inr(room.price)}<span className="font-normal text-[#f5f1e8]/70">/ night</span></span> : null}
            {room.sleeps ? <span className={GLASS}><Users className="h-3.5 w-3.5 text-[#d9c193]" aria-hidden />Sleeps {room.sleeps}</span> : null}
            {typeof room.free === 'number' && <span className={GLASS}>{room.free > 0 ? `${room.free} free tonight` : 'Booked tonight'}</span>}
            {room.perks?.slice(0, 1).map((p) => <span key={p} className={GLASS}>{p}</span>)}
          </div>
        </div>
      </div>
    </article>
  );
}
