import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, CalendarDays, MapPin } from 'lucide-react';
import { REGION_LABEL, shortDate } from '../api';
import { moodPhoto } from '../photos';
import { FOCUS } from '../ui';
import type { PostPlan } from './types';

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Post text with its place set in olive; the place is a link to its page when it is a listed place. */
export function PostBody({ body, place, placeId, region }: { body: string; place: string | null; placeId?: string | null; region: string | null }) {
  const parts = place ? body.split(new RegExp(`(${escape(place)})`, 'i')) : [body];
  const inText = Boolean(place) && parts.length > 1;
  const regionText = region ? REGION_LABEL[region] : null;
  const tagLabel = [!inText ? place : null, regionText].filter(Boolean).join(' · ');
  const tagClass = 'mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#e1efe3] px-3 py-1 text-xs font-semibold text-[#2f5d1f]';
  return (
    <>
      <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-[#14261b]/90">
        {parts.map((part, i) => (i % 2 === 1
          ? <span key={i} className="font-semibold text-[#3c6b2b] underline decoration-[#c8da4a] decoration-2 underline-offset-4">{part}</span>
          : part))}
      </p>
      {tagLabel && (placeId
        ? <Link href={`/club/places/${placeId}`} className={`${tagClass} ${FOCUS}`}><MapPin aria-hidden="true" className="h-3.5 w-3.5" />{tagLabel}</Link>
        : <p className={tagClass}><MapPin aria-hidden="true" className="h-3.5 w-3.5" />{tagLabel}</p>)}
    </>
  );
}

/** An approved plan attached to a post, as a photo card. */
export function PlanAttachment({ plan }: { plan: PostPlan }) {
  return (
    <Link href={`/club/events/${plan.id}`} className={`group relative mt-4 block h-40 overflow-hidden rounded-[22px] ${FOCUS}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={plan.cover || moodPhoto(plan.kind, plan.id, 900)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
      <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-[#14261b] backdrop-blur"><ArrowUpRight aria-hidden="true" className="h-4 w-4" /></span>
      <span className="absolute inset-x-4 bottom-3.5 text-white">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#e2ee9a]">Plan to join</span>
        <span className="block truncate text-lg font-semibold">{plan.title}</span>
        <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-white/85"><CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />{shortDate(plan.starts_at)}{plan.venue ? ` · ${plan.venue}` : ''}</span>
      </span>
    </Link>
  );
}
