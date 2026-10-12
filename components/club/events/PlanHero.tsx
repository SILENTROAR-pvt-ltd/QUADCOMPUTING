'use client';

import React, { useState } from 'react';
import { BadgeCheck, CalendarDays, Check, MapPin, Share2 } from 'lucide-react';
import { FOCUS } from '../ui';
import { dateSpan } from '../api';
import { CLUB_DISPLAY } from '../fonts';
import { LiveSlides } from '../LivePhotos';
import { moodPhoto } from '../photos';
import { kindOf } from '../trips/plans';

const GLASS = `grid h-11 w-11 place-items-center rounded-full bg-white/25 text-white backdrop-blur-md transition hover:bg-white/40 ${FOCUS}`;

/** The plan's photos as a live gallery, with its title, dates and place laid over the image. */
export function PlanHero({ event }: { event: any }) {
  const [copied, setCopied] = useState(false);
  const kind = kindOf(event.kind);
  const srcs: string[] = event.covers.length ? event.covers : [moodPhoto(event.kind, event.id, 1600)];

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: event.title, url });
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    } catch { /* dismissed */ }
  };

  return (
    <LiveSlides srcs={srcs} alts={srcs.map((_, i) => `${event.title} photo ${i + 1}`)} dots className="h-[420px] rounded-[36px] sm:h-[480px]">
      {() => (
        <>
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/25" />
          <div className="absolute right-4 top-4 flex gap-2">
            <button type="button" onClick={share} aria-label={copied ? 'Link copied' : 'Share this plan'} className={GLASS}>{copied ? <Check className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}</button>
          </div>
          <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-xs font-semibold text-[#14261b] backdrop-blur">{kind.emoji} {kind.label}</span>
          <div className="absolute inset-x-5 bottom-10 text-white sm:inset-x-8">
            {event.verified && <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-[#c8da4a] px-3 py-1 text-xs font-bold text-[#14261b]"><BadgeCheck className="h-3.5 w-3.5" /> Vibers Verified Plan</span>}
            {event.status !== 'approved' && <span className="mb-3 ml-1 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold capitalize text-amber-900">{event.status}</span>}
            <h2 className={`${CLUB_DISPLAY} text-[34px] font-semibold leading-[1.05] sm:text-5xl`}>{event.title}</h2>
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/90">
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-[#e2ee9a]" />{dateSpan(event.starts_at, event.ends_at)}</span>
              {event.venue && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-[#e2ee9a]" />{event.venue}</span>}
            </p>
          </div>
        </>
      )}
    </LiveSlides>
  );
}
