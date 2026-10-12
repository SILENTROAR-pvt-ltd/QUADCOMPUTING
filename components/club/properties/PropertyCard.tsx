import React from 'react';
import Link from 'next/link';
import { MapPin, Users } from 'lucide-react';
import { Badge } from '../ui';
import { rupees } from '../api';
import { CLUB_DISPLAY } from '../fonts';
import { moodPhoto } from '../photos';

/** A partner stay: photo with a soft gradient, name in serif, city, group size and nightly range. */
export function PropertyCard({ p, eventId }: { p: any; eventId?: string | null }) {
  return (
    <Link href={`/club/properties/${p.id}${eventId ? `?event=${eventId}` : ''}`}
      className="group overflow-hidden rounded-[30px] bg-[#fbfaf6] shadow-[0_20px_44px_-32px_rgba(20,38,27,0.6)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17301f]/50">
      <div className="relative aspect-[16/11] overflow-hidden rounded-b-[30px] bg-[#dfe7d5]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.photo || moodPhoto('stay', p.id, 900)} alt="" loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1">
          {p.categories.map((c: string) => <span key={c} className="rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-semibold capitalize text-[#14261b] backdrop-blur">{c}</span>)}
        </div>
      </div>
      <div className="p-5">
        {p.status && p.status !== 'verified' && <Badge tone="warn">{p.status}</Badge>}
        <p className={`${CLUB_DISPLAY} text-xl font-semibold leading-tight`}>{p.name}</p>
        <p className="mt-1.5 flex items-center gap-3 text-xs text-[#14261b]/70">
          <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-[#3c6b2b]" />{p.city}</span>
          <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5 text-[#3c6b2b]" />up to {p.capacity}</span>
        </p>
        <p className="mt-3 text-sm"><span className="text-[#14261b]/60">From </span><span className={`${CLUB_DISPLAY} text-lg font-semibold`}>{rupees(p.price_min)}</span><span className="text-[#14261b]/60"> / night</span></p>
      </div>
    </Link>
  );
}
