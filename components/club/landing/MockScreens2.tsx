import React from 'react';
import { ArrowRight, BadgeCheck, CalendarDays, MapPin, MessageSquare, Users } from 'lucide-react';
import { CLUB_DISPLAY } from '../fonts';
import { DESTINATIONS, photoUrl } from '../photos';
import { MiniFace } from './Phone';

// More mini screens for the landing's phone mock-ups: trips and a travel profile.

export function MockTrips() {
  return (
    <div className="space-y-2.5">
      <p className={`${CLUB_DISPLAY} text-[22px] font-semibold`}>Popular</p>
      <div className="rounded-[22px] bg-[#17301f] p-3 text-[#f6f4ec]">
        <p className="text-[7px] uppercase tracking-[0.18em] text-[#c8da4a]">Rajasthan</p>
        <p className="mt-0.5 text-[13px] font-semibold">Desert camp under the stars</p>
        <p className="mt-1 flex items-center gap-1 text-[8px] text-[#f6f4ec]/75"><CalendarDays className="h-2.5 w-2.5 text-[#c8da4a]" />27 Nov – 30 Nov</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="flex">{['Asha R', 'Kabir S', 'Meera J'].map((n, i) => <span key={n} className="-ml-1.5 first:ml-0"><MiniFace name={n} size={18} tone={i} ring="ring-[#17301f]" /></span>)}<span className="-ml-1.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-[#c8da4a] text-[7px] font-bold text-[#17301f] ring-2 ring-[#17301f]">+22</span></span>
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[#c8da4a] text-[#17301f]"><ArrowRight className="h-3 w-3" /></span>
        </div>
      </div>
      <div className="flex gap-1.5 text-[7.5px] font-semibold">
        <span className="flex items-center gap-1 rounded-full bg-[#17301f] px-2 py-1 text-[#f6f4ec]"><CalendarDays className="h-2.5 w-2.5 text-[#c8da4a]" />Nov</span>
        <span className="rounded-full bg-white px-2 py-1">Dec</span><span className="rounded-full bg-white px-2 py-1">Jan</span>
      </div>
      <div className="relative h-36 overflow-hidden rounded-[22px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoUrl(DESTINATIONS.bali.id, 400)} alt="" className="h-full w-full object-cover" />
        <span className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
        <span className="absolute inset-x-2.5 bottom-2.5 text-white"><span className="text-[7px] uppercase tracking-[0.18em]">Indonesia</span><span className="block text-[12px] font-semibold">Temples &amp; rice terraces</span><span className="text-[7.5px] text-[#e2ee9a]">31 travelers going</span></span>
      </div>
    </div>
  );
}

export function MockProfile() {
  return (
    <div className="-mx-3.5 -mt-2 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photoUrl(DESTINATIONS.wanaka.id, 500)} alt="" className="h-28 w-full rounded-b-[26px] object-cover" />
      <div className="-mt-9 flex justify-center"><span className="rounded-full border-4 border-[#f4f3ec]"><MiniFace name="Sana Alvi" size={64} tone={1} ring="ring-transparent" /></span></div>
      <p className={`${CLUB_DISPLAY} mt-1 flex items-center justify-center gap-1 text-[16px] font-semibold`}>Sana Alvi <BadgeCheck className="h-4 w-4 fill-[#c8da4a] text-[#17301f]" /></p>
      <p className="text-[8.5px] text-[#14261b]/75"><MapPin className="inline h-2.5 w-2.5 text-[#3c6b2b]" /> Mumbai | Gen Z | Viber</p>
      <p className="mt-0.5 text-[7.5px] font-semibold text-[#3c6b2b]">@sana_travels</p>
      <div className="mx-3.5 mt-2.5 grid grid-cols-3 divide-x divide-[#14261b]/10 rounded-2xl bg-white py-2 shadow-sm">
        {[[MessageSquare, 14, 'Posts'], [MapPin, 6, 'Hosted'], [Users, 23, 'Trips']].map(([Icon, n, label]: any) => (
          <div key={label}><Icon className="mx-auto h-3 w-3 text-[#3c6b2b]" /><p className="text-[12px] font-bold">{n}</p><p className="text-[7px] text-[#14261b]/60">{label}</p></div>
        ))}
      </div>
      <p className="mx-3.5 mt-2 rounded-full bg-[#17301f] py-1.5 text-[9px] font-bold text-[#f6f4ec]">Message</p>
      <div className="mx-3.5 mt-2 grid grid-cols-3 gap-1">
        {[DESTINATIONS.santorini.id, DESTINATIONS.cappadocia.id, DESTINATIONS.thailand.id].map((id) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={id} src={photoUrl(id, 160)} alt="" className="h-14 w-full rounded-lg object-cover" />
        ))}
      </div>
    </div>
  );
}
