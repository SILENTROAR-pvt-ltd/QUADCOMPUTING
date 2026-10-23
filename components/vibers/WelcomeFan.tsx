'use client';

import React, { useRef } from 'react';
import { PHOTOS } from './vibers-media';
import { DISPLAY } from './vibers-fonts';
import { useScrollVar, type ScrollMeasure } from './useScrollVar';
import s from './luxe.module.css';

const CARDS = [
  { photo: PHOTOS.courtyard, title: 'Venues with soul', text: 'Chosen for their common spaces, not their star count.', x: '72%', y: '28px', r: '-11deg', r2: '-2deg' },
  { photo: PHOTOS.together, title: 'Registered Vibers', text: 'Like-minded people, and a promise to keep the vibe safe.', x: '0%', y: '0px', r: '0deg', r2: '0deg' },
  { photo: PHOTOS.spaPhone, title: 'Your stay, your way', text: 'One digital key to the whole stay, from check-in to the last bill.', x: '-72%', y: '28px', r: '11deg', r2: '2deg' },
];

// 0 while the row's top is at the bottom of the screen, 1 once it has risen to 40% from the top.
const fanOut: ScrollMeasure = (box, vh) => (vh - box.top) / (vh * 0.6);

/**
 * The welcome's three promises as photo cards. On wider screens they arrive as a tilted stack and fan out into a row as
 * the reader scrolls in (the scroll sets --p from 0 to 1 on the row). On a phone they are a swipeable row. Without
 * JavaScript or with reduced motion, the row simply sits in its final place.
 */
export function WelcomeFan() {
  const row = useRef<HTMLUListElement>(null);
  useScrollVar(row, fanOut);

  return (
    <ul ref={row} data-rail="" className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-6 md:mx-auto md:max-w-[980px] md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 md:pb-0">
      {CARDS.map((c, i) => (
        <li key={c.title} className={`${s.fanCard} w-[76%] shrink-0 snap-center md:w-auto ${i === 1 ? 'md:z-10' : ''}`}
          style={{ ['--x' as string]: c.x, ['--y' as string]: c.y, ['--r' as string]: c.r, ['--r2' as string]: c.r2 } as React.CSSProperties}>
          <figure className="overflow-hidden rounded-[20px] bg-[#fbf9f4] shadow-[0_30px_70px_-40px_rgba(16,35,26,0.55)] ring-1 ring-[#10231a]/[0.06]">
            <div className="relative aspect-[4/5] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.photo.src} alt={c.photo.alt} width={c.photo.width} height={c.photo.height} loading="lazy" decoding="async" className="h-full w-full object-cover" />
              <div className={`absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,#fbf9f4_92%)] ${i === 1 ? 'h-1/5' : 'h-1/3'}`} />
            </div>
            <figcaption className="-mt-10 px-6 pb-7 text-center">
              <span className={`${DISPLAY} relative text-[13px] italic text-[#b08d57]`}>{['I', 'II', 'III'][i]}</span>
              <p className={`${DISPLAY} relative mt-1 text-[1.55rem] font-normal italic leading-tight text-[#10231a]`}>{c.title}</p>
              <p className="relative mx-auto mt-2 max-w-[15rem] text-[13px] leading-relaxed text-[#10231a]/60">{c.text}</p>
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  );
}
