import React from 'react';
import { PHOTOS } from './vibers-media';
import type { Experience } from './vibers-experiences';
import { DISPLAY } from './vibers-fonts';
import s from './luxe.module.css';

// Each card floats on its own beat (a negative delay starts it mid-drift) and sits at its own height, so the row reads
// as a loose constellation rather than a grid.
const BEATS = [
  { y: 'mt-0', fd: '6.6s', fdl: '0s' },
  { y: 'mt-12', fd: '7.9s', fdl: '-2.2s' },
  { y: 'mt-5', fd: '7.2s', fdl: '-4.1s' },
  { y: 'mt-16', fd: '8.5s', fdl: '-1.3s' },
];

/** One experience in an arch-topped frame: the photo, its vibe, the time of day, its name and a line about it. */
export function ExperienceCard({ e, i }: { e: Experience; i: number }) {
  const b = BEATS[i % BEATS.length];
  return (
    <div className={`${s.float} ${b.y}`} style={{ ['--fd' as string]: b.fd, ['--fdl' as string]: b.fdl } as React.CSSProperties}>
      <figure className={`${s.lift} group relative isolate overflow-hidden rounded-b-[22px] rounded-t-[999px] bg-[#0f2a1e] shadow-[0_34px_60px_-38px_rgba(16,35,26,0.65)]`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={e.photo.src} alt={e.photo.alt} width={e.photo.width} height={e.photo.height} loading="lazy" decoding="async" className="aspect-[5/7] w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(8,22,15,0.9)_100%)]" />
        <span className="absolute left-1/2 top-[12%] -translate-x-1/2 whitespace-nowrap rounded-full bg-[#f5f1e8]/90 px-3 py-1 text-[9.5px] font-semibold uppercase tracking-[0.22em] text-[#10231a]">{e.vibe}</span>
        <figcaption className="absolute inset-x-0 bottom-0 px-5 pb-6 text-center text-[#f5f1e8]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#d9c193]">{e.time}</p>
          <p className={`${DISPLAY} mt-2 text-[1.5rem] font-normal leading-[1.05]`}>{e.title}</p>
          <p className="mx-auto mt-1.5 max-w-[15rem] text-[12.5px] leading-snug text-[#f5f1e8]/75">{e.note}</p>
        </figcaption>
      </figure>
    </div>
  );
}

const ORBS = [
  { photo: PHOTOS.raveHills, size: 'h-28 w-28', at: 'right-[4%] top-0', fd: '11s', fdl: '0s', ox: '-14px', oy: '16px' },
  { photo: PHOTOS.horse, size: 'h-20 w-20', at: 'right-[26%] top-[38%]', fd: '9s', fdl: '-3s', ox: '12px', oy: '-14px' },
  { photo: PHOTOS.coffee, size: 'h-16 w-16', at: 'right-[44%] top-[6%]', fd: '10s', fdl: '-6s', ox: '-10px', oy: '12px' },
  { photo: PHOTOS.run, size: 'h-24 w-24', at: 'right-[12%] top-[58%]', fd: '12s', fdl: '-2s', ox: '10px', oy: '-18px' },
];

/** Round photographs of the experiences drifting slowly behind the heading, on wider screens. Decorative. */
export function ExperienceOrbs() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 md:block">
      {ORBS.map((o) => (
        <span key={o.photo.src} className={`${s.orbit} absolute ${o.at} ${o.size} overflow-hidden rounded-full border-[3px] border-[#f5f1e8] shadow-[0_20px_40px_-22px_rgba(16,35,26,0.55)]`}
          style={{ ['--fd' as string]: o.fd, ['--fdl' as string]: o.fdl, ['--ox' as string]: o.ox, ['--oy' as string]: o.oy } as React.CSSProperties}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={o.photo.src} alt="" width={o.photo.width} height={o.photo.height} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        </span>
      ))}
    </div>
  );
}
