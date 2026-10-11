import React from 'react';
import Link from 'next/link';
import { MapPin, Users } from 'lucide-react';
import { Badge } from '../ui';
import { rupees } from '../api';

export function PropertyCard({ p, eventId }: { p: any; eventId?: string | null }) {
  return (
    <Link href={`/club/properties/${p.id}${eventId ? `?event=${eventId}` : ''}`} className="group overflow-hidden rounded-3xl border border-[#2a1250]/10 bg-white/85 transition hover:shadow-lg">
      <div className="aspect-[16/10] bg-[#f3ebff]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {p.photo && <img src={p.photo} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="p-4">
        <div className="flex flex-wrap gap-1">{p.categories.map((c: string) => <Badge key={c}>{c}</Badge>)}{p.status && p.status !== 'verified' && <Badge tone="warn">{p.status}</Badge>}</div>
        <p className="mt-2 font-semibold group-hover:underline">{p.name}</p>
        <p className="mt-1 flex items-center gap-3 text-xs text-[#2a1250]/55">
          <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{p.city}</span>
          <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />up to {p.capacity}</span>
        </p>
        <p className="mt-2 text-sm font-semibold">{rupees(p.price_min)} – {rupees(p.price_max)} <span className="font-normal text-[#2a1250]/50">/ night</span></p>
      </div>
    </Link>
  );
}
