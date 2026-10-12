import React from 'react';
import { CalendarDays, Heart, MessageSquare, Search, Ticket, Users } from 'lucide-react';
import { CLUB_DISPLAY } from '../fonts';
import { DESTINATIONS, photoUrl } from '../photos';
import { MiniFace } from './Phone';

// Mini screens of the real app for the landing's phone mock-ups. Sample content, clearly illustrative.
const img = (id: string, w = 400) => photoUrl(id, w);

export function MockRoom() {
  const tiles = [DESTINATIONS.ladakh, DESTINATIONS.halong, DESTINATIONS.santorini];
  return (
    <div className="space-y-2.5">
      <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#3c6b2b]">Good evening</p>
      <p className={`${CLUB_DISPLAY} -mt-1.5 text-[19px] font-semibold leading-tight`}>Where to <em className="text-[#3c6b2b]">next</em>, Asha?</p>
      <p className="flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[9px] text-[#14261b]/50 shadow-sm"><Search className="h-2.5 w-2.5" />Search posts, places…</p>
      <div className="flex gap-1.5">
        {tiles.map((t) => (
          <span key={t.id} className="relative h-16 flex-1 overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img(t.id, 200)} alt="" className="h-full w-full object-cover" />
            <span className="absolute inset-x-1 bottom-1 text-[7px] font-semibold text-white drop-shadow">{t.country}</span>
          </span>
        ))}
      </div>
      <div className="rounded-2xl bg-white p-2.5 shadow-sm">
        <div className="flex items-center gap-1.5"><MiniFace name="Kabir Shah" /><div><p className="text-[9px] font-semibold">Kabir Shah</p><p className="text-[7px] text-[#14261b]/55">5 minutes ago</p></div></div>
        <p className="mt-1.5 text-[9px] leading-snug">Riding to <span className="font-semibold text-[#3c6b2b] underline decoration-[#c8da4a] decoration-2">Ladakh</span> in June. Anyone want to split the bike rental?</p>
        <p className="mt-1.5 flex gap-1.5 text-[8px]"><span className="flex items-center gap-0.5 rounded-full bg-[#c8da4a] px-2 py-0.5 font-semibold"><Heart className="h-2.5 w-2.5" fill="currentColor" />24</span><span className="flex items-center gap-0.5 rounded-full bg-[#f2f0e8] px-2 py-0.5"><MessageSquare className="h-2.5 w-2.5" />6</span></p>
      </div>
    </div>
  );
}

export function MockExplore() {
  return (
    <div className="overflow-hidden rounded-[26px] bg-[#e1efe3]">
      <div className="relative h-44 overflow-hidden rounded-b-[26px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img(DESTINATIONS.kerala.id)} alt="" className="h-full w-full object-cover" />
        <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <span className="absolute left-2.5 top-2.5 rounded-full bg-white/85 px-2 py-0.5 text-[7.5px] font-semibold">🏔️ Tour</span>
        <span className="absolute inset-x-3 bottom-2.5 text-white"><span className="text-[8px]">● Sat, 18 Oct · 7:00 am</span><span className={`${CLUB_DISPLAY} block text-[17px] font-semibold leading-tight`}>Houseboat weekend</span></span>
      </div>
      <div className="p-3">
        <p className="text-[7.5px] font-bold uppercase tracking-[0.18em] text-[#2f5d1f]">Alleppey, Kerala</p>
        <div className="mt-2 flex flex-wrap gap-1 text-[8px] font-semibold">
          <span className="flex items-center gap-0.5 rounded-full bg-white px-2 py-1"><Users className="h-2.5 w-2.5" />12 going</span>
          <span className="flex items-center gap-0.5 rounded-full bg-white px-2 py-1"><CalendarDays className="h-2.5 w-2.5" />2 days</span>
          <span className="flex items-center gap-0.5 rounded-full bg-white px-2 py-1"><Ticket className="h-2.5 w-2.5" />8 left</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[8px] text-[#14261b]/70"><span className={`${CLUB_DISPLAY} text-[15px] font-semibold text-[#14261b]`}>₹6,499</span> / person</p>
          <span className="flex items-center gap-1 rounded-full bg-[#c8da4a] px-3 py-1.5 text-[9px] font-bold"><Heart className="h-2.5 w-2.5" fill="currentColor" />I&apos;m in</span>
        </div>
      </div>
    </div>
  );
}
