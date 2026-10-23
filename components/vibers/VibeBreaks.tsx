'use client';

import React, { useRef } from 'react';
import { PHOTOS } from './vibers-media';
import { CONTAINER, KICKER_LIGHT, TURN_LIGHT } from './vibers-brand';
import { DISPLAY } from './vibers-fonts';
import { useScrollVar, type ScrollMeasure } from './useScrollVar';
import s from './luxe.module.css';

const LINES = [
  { text: 'Your plan was perfect.', at: 0.02 },
  { text: 'Then came the wrong energy: societal eyes, and a rule book for how to live, laugh and talk.', at: 0.22 },
  { text: 'Your vibe became a checklist. And you became the one being judged.', at: 0.42 },
];

// 0 as the section pins to the top of the screen, 1 as its end arrives; the pinned frame holds in between.
const through: ScrollMeasure = (box, vh) => -box.top / Math.max(1, box.height - vh);

/**
 * The moment every Viber knows, told as one pinned frame the reader scrolls through: a woman standing still in a hurrying
 * crowd, in grey; three short lines light up one by one; then the photo warms into colour with the answer, "that is
 * exactly why we built this". Without JavaScript or with reduced motion, everything shows at once, in colour.
 */
export function VibeBreaks() {
  const ref = useRef<HTMLElement>(null);
  useScrollVar(ref, through);
  const p = PHOTOS.crowd;

  return (
    <section ref={ref} aria-labelledby="breaks-title" style={{ ['--p' as string]: 1 } as React.CSSProperties}
      className="relative h-[230svh] bg-[#14110d] text-[#f5f1e8] motion-reduce:h-auto lg:h-[250vh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden motion-reduce:relative motion-reduce:h-auto lg:h-screen">
        <div aria-hidden="true" className="absolute -left-40 top-1/4 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(217,193,147,0.12),transparent_65%)]" />
        {/* On wide screens the frame is centred below the fixed bar (72px). */}
        <div className={`${CONTAINER} relative grid h-full items-end pb-14 pt-24 motion-reduce:py-28 lg:grid-cols-[1fr_0.8fr] lg:items-center lg:gap-20 lg:pb-0 lg:pt-[72px]`}>
          {/* The photo: full-bleed behind the words on a phone, a tall print beside them on wider screens. */}
          <figure className="absolute inset-0 overflow-hidden lg:relative lg:inset-auto lg:order-2 lg:h-[76vh] lg:max-h-[740px] lg:rounded-[2px]">
            <div className={`${s.breakZoom} absolute inset-0`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt="" width={p.width} height={p.height} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover brightness-90 grayscale" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt={p.alt} width={p.width} height={p.height} loading="lazy" decoding="async" className={`${s.breakColor} absolute inset-0 h-full w-full object-cover`} />
            </div>
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,17,13,0.35)_0%,rgba(20,17,13,0.6)_45%,rgba(20,17,13,0.95)_100%)] lg:bg-[linear-gradient(180deg,transparent_60%,rgba(20,17,13,0.55)_100%)]" />
            <figcaption className={`${DISPLAY} absolute bottom-5 left-6 hidden text-[15px] italic text-[#f5f1e8]/80 lg:block`}>Standing still, while everyone else hurries.</figcaption>
          </figure>

          <div className="relative max-w-xl">
            <p className={KICKER_LIGHT}>When the vibe breaks</p>
            <h2 id="breaks-title" className={`${DISPLAY} mt-5 text-[2.1rem] font-light leading-[1.08] sm:text-[2.7rem] lg:text-[3.1rem]`}>
              A Viber should never have to <em className={TURN_LIGHT}>shrink to fit a room.</em>
            </h2>
            <div className="relative mt-9 pl-6 sm:mt-11">
              <span aria-hidden="true" className="absolute left-0 top-1 h-[calc(100%-0.5rem)] w-px bg-[#f5f1e8]/15">
                <span className={`${s.breakRail} absolute inset-0 bg-[#d9c193]`} />
              </span>
              <ol className="space-y-4 sm:space-y-5">
                {LINES.map((l) => (
                  <li key={l.at} className={`${s.breakLine} ${DISPLAY} text-[1.2rem] font-light leading-snug sm:text-[1.45rem]`} style={{ ['--s' as string]: l.at } as React.CSSProperties}>
                    {l.text}
                  </li>
                ))}
              </ol>
              <a href="#why" className={`${s.breakLine} group mt-8 inline-flex items-center gap-4 whitespace-nowrap text-[10.5px] font-semibold uppercase tracking-[0.2em] text-[#d9c193] sm:text-[11px] sm:tracking-[0.3em]`} style={{ ['--s' as string]: 0.62 } as React.CSSProperties}>
                That is exactly why we built this
                <span aria-hidden="true" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#d9c193]/50 transition-transform duration-500 group-hover:translate-x-1">&rarr;</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
