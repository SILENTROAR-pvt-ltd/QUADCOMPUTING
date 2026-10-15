'use client';

import React from 'react';
import { LOUNGE_MEDIA, LOUNGE_TINT } from './lounge-media';
import { POSTCARD_SERIF } from './MemoryPostcard';

/** A small photographic print: white border, a little tilt, a soft shadow. */
export function Print({ src, tint, tilt, className = '', eager = false }: { src: string; tint: string; tilt: number; className?: string; eager?: boolean }) {
  return (
    <span
      aria-hidden
      className={`block rounded-[3px] bg-white p-1 pb-3 shadow-[0_10px_20px_-10px_rgba(0,0,0,0.55)] ${className}`}
      style={{ transform: `rotate(${tilt}deg)` }}
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
 * The top of the lobby: the cafe's people and plates, a line about the room, and two prints pinned to the corner. One 45 KB
 * photograph behind the words, and two small prints; the box is held at its size and tinted, so nothing moves as they load.
 */
export function LoungeHero({ venueName }: { venueName: string }) {
  return (
    <section aria-label={`Moments at ${venueName || 'the venue'}`} className="relative isolate overflow-hidden rounded-[26px] bg-zinc-900 shadow-[0_24px_44px_-28px_rgba(0,0,0,0.7)]" style={{ backgroundColor: LOUNGE_TINT.hero }}>
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
        className="absolute inset-0 -z-10 h-full w-full select-none object-cover object-[62%_50%]"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-zinc-950/85 via-zinc-950/55 to-zinc-950/10" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-zinc-950/55 via-transparent to-transparent" />

      <div className="relative min-h-[236px] px-5 pb-5 pt-6 sm:min-h-[260px] sm:px-7 sm:pt-8">
        <div className="max-w-[52%] sm:max-w-[50%]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/70">Vibers Lobby</p>
          <h2 className="mt-2 text-[27px] leading-[1.08] text-white sm:text-[34px] [text-wrap:balance]" style={POSTCARD_SERIF}>Moments worth keeping</h2>
          <p className="mt-2.5 text-[12.5px] leading-snug text-white/75 sm:text-[13.5px]">From everyone at {venueName || 'the venue'}.</p>
        </div>

        <Print src={LOUNGE_MEDIA.toast} tint={LOUNGE_TINT.toast} tilt={7} eager className="absolute right-2.5 top-3.5 w-[84px] sm:right-8 sm:top-6 sm:w-[118px]" />
        <Print src={LOUNGE_MEDIA.feast} tint={LOUNGE_TINT.feast} tilt={-6} eager className="absolute bottom-3.5 right-[30px] w-[76px] sm:bottom-6 sm:right-[150px] sm:w-[108px]" />
      </div>
    </section>
  );
}

export default LoungeHero;
