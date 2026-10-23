'use client';

import React from 'react';
import { LOUNGE_MEDIA, LOUNGE_TINT } from './lounge-media';
import { POSTCARD_SERIF } from './MemoryPostcard';
import s from '@/components/guest/luxe/luxe-guest.module.css';

/** A small photographic print: white border, a little tilt, a soft shadow. With `floating` it drifts gently. */
export function Print({ src, tint, tilt, className = '', eager = false, floating = false, beat = '6s' }: {
  src: string; tint: string; tilt: number; className?: string; eager?: boolean; floating?: boolean; beat?: string;
}) {
  return (
    <span
      aria-hidden
      className={`block rounded-[3px] bg-white p-1 pb-3 shadow-[0_14px_26px_-12px_rgba(0,0,0,0.6)] ${floating ? s.float : ''} ${className}`}
      style={{ transform: `rotate(${tilt}deg)`, ['--tilt' as string]: `${tilt}deg`, ['--fd' as string]: beat } as React.CSSProperties}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a 10-25 KB WebP from public/media; images.unoptimized is set, so next/image would not shrink it either */}
      <img
        src={src}
        alt=""
        width={300}
        height={375}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        className="aspect-[4/5] w-full select-none object-cover"
        style={{ backgroundColor: tint }}
      />
    </span>
  );
}

/**
 * The top of the lobby, like a chapter of the Vibers Connect home: the cafe's people settling slowly into frame under a
 * forest veil, a gold kicker, the line in the house serif, and two prints pinned to the corner that drift a little. The
 * box is held at its size and tinted, so nothing moves as the photos load.
 */
export function LoungeHero({ venueName }: { venueName: string }) {
  return (
    <section aria-label={`Events at ${venueName || 'the venue'}`} className="relative isolate overflow-hidden rounded-[28px] shadow-[0_30px_60px_-36px_rgba(15,42,30,0.85)]" style={{ backgroundColor: LOUNGE_TINT.hero }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- the hero is a 45 KB WebP from public/media; fetchPriority is not available on next/image here */}
      <img
        src={LOUNGE_MEDIA.hero}
        alt=""
        width={960}
        height={540}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        draggable={false}
        className={`${s.kenburns} absolute inset-0 -z-10 h-full w-full select-none object-cover object-[62%_50%]`}
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-[#08160f]/90 via-[#08160f]/60 to-[#08160f]/10" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-[#08160f]/70 via-transparent to-transparent" />
      <div aria-hidden className="absolute -left-16 -top-20 -z-10 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(217,193,147,0.22),transparent_68%)]" />

      <div className="relative min-h-[250px] px-5 pb-6 pt-6 sm:min-h-[280px] sm:px-7 sm:pt-8">
        <div className="max-w-[54%] sm:max-w-[52%]">
          <p className={`${s.enter} flex items-center gap-2 text-[9.5px] font-semibold uppercase tracking-[0.3em] text-[#d9c193] before:h-px before:w-5 before:bg-[#d9c193]`}>Vibers Lobby</p>
          <h2 className={`${s.enter} mt-2.5 text-[32px] font-light leading-[1.02] text-[#f5f1e8] [text-wrap:balance] sm:text-[40px]`} style={{ ...POSTCARD_SERIF, ['--d' as string]: '0.12s' }}>
            Nights worth <em className="font-normal text-[#e6cf9c]">showing up for</em>
          </h2>
          <p className={`${s.enter} mt-3 text-[12.5px] leading-snug text-[#f5f1e8]/75 sm:text-[13.5px]`} style={{ ['--d' as string]: '0.24s' } as React.CSSProperties}>From everyone at {venueName || 'the venue'}.</p>
        </div>

        <Print src={LOUNGE_MEDIA.toast} tint={LOUNGE_TINT.toast} tilt={7} eager floating beat="6.4s" className="absolute right-3 top-4 w-[86px] sm:right-8 sm:top-6 sm:w-[118px]" />
        <Print src={LOUNGE_MEDIA.feast} tint={LOUNGE_TINT.feast} tilt={-6} eager floating beat="7.6s" className="absolute bottom-4 right-[34px] w-[78px] sm:bottom-6 sm:right-[150px] sm:w-[108px]" />
      </div>
    </section>
  );
}

export default LoungeHero;
