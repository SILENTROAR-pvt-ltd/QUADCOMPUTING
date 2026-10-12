import React from 'react';
import Link from 'next/link';
import { Eye, MessageSquare, Clock } from 'lucide-react';
import { CLUB_DISPLAY } from '../fonts';
import { FOCUS } from '../ui';
import { PlanButton } from './PlanButton';
import { KIND_LABEL, type Place } from './types';

/** A place in a browse grid: its picture (or a typographic cover), live numbers, and "planning to go". */
export function PlaceCard({ place }: { place: Place }) {
  const kinds = place.kinds.slice(0, 3).map((k) => KIND_LABEL[k] ?? k);
  return (
    <article className="group flex flex-col overflow-hidden rounded-[30px] bg-[#fbfaf6] shadow-[0_20px_44px_-32px_rgba(20,38,27,0.6)] ring-1 ring-[#14261b]/[0.04]">
      <Link href={`/club/places/${place.id}`} className={`relative block aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#dfe9c4] via-[#9fbf7a] to-[#17301f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white ${FOCUS}`}>
        {place.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={place.cover} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        )}
        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-[#14261b]">{place.country}</span>
        <span className="absolute inset-x-5 bottom-5 text-white">
          <span className={`${CLUB_DISPLAY} block text-[30px] font-semibold leading-none`}>{place.name}</span>
          {place.blurb && <span className="mt-2 line-clamp-2 block text-[13px] text-white/90">{place.blurb}</span>}
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap gap-1.5">
          {kinds.map((k) => <span key={k} className="rounded-full bg-[#e1efe3] px-2.5 py-1 text-[11px] font-semibold text-[#2f5d1f]">{k}</span>)}
        </div>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#14261b]/65">
          <span className="inline-flex items-center gap-1"><Clock aria-hidden="true" className="h-3.5 w-3.5" />{place.stats.stories} live {place.stats.stories === 1 ? 'story' : 'stories'}</span>
          <span className="inline-flex items-center gap-1"><MessageSquare aria-hidden="true" className="h-3.5 w-3.5" />{place.stats.posts} posts this week</span>
          <span className="inline-flex items-center gap-1"><Eye aria-hidden="true" className="h-3.5 w-3.5" />{place.stats.planning} planning</span>
        </p>
        <div className="mt-auto pt-1">
          <PlanButton placeId={place.id} planning={place.planning} size="sm" />
        </div>
      </div>
    </article>
  );
}
