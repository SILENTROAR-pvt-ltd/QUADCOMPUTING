'use client';

import React, { useEffect, useRef, useState } from 'react';
import { PHOTOS } from './vibers-media';
import { DISPLAY } from './vibers-fonts';
import s from './luxe.module.css';

const POINTS = [
  { n: '01', tag: 'The people', title: 'Vibers find each other', photo: PHOTOS.meet, focus: '58% 50%',
    text: 'Registered, like-minded people at every Vibers Connect point. Never random, and never alone unless you want to be.' },
  { n: '02', tag: 'The space', title: 'Spaces that understand', photo: PHOTOS.lounge, focus: '50% 50%',
    text: 'Every venue has a common space to actually meet, and hosts who get the vibe before you have to explain it.' },
  { n: '03', tag: 'The choice', title: 'Inner peace, or a blast', photo: PHOTOS.peace, focus: '62% 50%',
    text: 'A quiet sunrise on your own, or a night out with your people. Your call, every single time.' },
];
const STEP_MS = 6500;

/**
 * Why Vibers Connect, as a deck of three photo cards beside three points. Choosing a point (or tapping a card behind)
 * brings its card to the front and opens its words; the others slide back into the deck. While the deck is on screen
 * and untouched, it moves on by itself, with a gold line showing the time left; the first choice a reader makes stops that.
 */
export function EcosystemDeck() {
  const [active, setActive] = useState(0);
  const [touched, setTouched] = useState(false);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const running = inView && !touched && !paused;

  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!running) return;
    const t = window.setTimeout(() => setActive((a) => (a + 1) % POINTS.length), STEP_MS);
    return () => clearTimeout(t);
  }, [running, active]);

  const choose = (i: number) => { setActive(i); setTouched(true); };

  return (
    <div ref={root} className="grid items-center gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="relative mx-auto w-full max-w-[480px] pr-[22%] pt-[12%] lg:order-2">
        <div className="relative aspect-[4/5]">
          {POINTS.map((pt, i) => {
            const depth = (i - active + POINTS.length) % POINTS.length;
            return (
              <figure key={pt.n} data-depth={depth} onClick={() => depth && choose(i)}
                className={`${s.deckCard} absolute inset-0 overflow-hidden rounded-[18px] bg-[#0f2a1e] shadow-[0_40px_80px_-40px_rgba(16,35,26,0.6)] ${depth ? 'cursor-pointer' : ''}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pt.photo.src} alt={depth ? '' : pt.photo.alt} width={pt.photo.width} height={pt.photo.height} loading="lazy" decoding="async"
                  className="h-full w-full object-cover" style={{ objectPosition: pt.focus }} />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_50%,rgba(8,22,15,0.85)_100%)]" />
                <div className={`${s.deckShade} absolute inset-0 bg-[#f5f1e8]/25`} />
                <figcaption className="absolute inset-x-0 bottom-0 p-6 text-[#f5f1e8]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#d9c193]">{pt.tag}</p>
                  <p className={`${DISPLAY} mt-1.5 text-[1.6rem] italic leading-tight`}>{pt.title}</p>
                </figcaption>
                <span className={`${DISPLAY} absolute right-5 top-4 text-[1.1rem] italic text-[#f5f1e8]/85`}>{pt.n}</span>
              </figure>
            );
          })}
        </div>
      </div>

      <ol className="border-t border-[#10231a]/10 lg:order-1">
        {POINTS.map((pt, i) => {
          const on = i === active;
          return (
            <li key={pt.n} className="relative border-b border-[#10231a]/10">
              <button type="button" aria-expanded={on} aria-controls={`why-point-${i}`} onClick={() => choose(i)}
                className="group grid w-full grid-cols-[3rem_1fr_auto] items-baseline gap-3 py-6 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0f2a1e]">
                <span className={`${DISPLAY} text-[1.25rem] italic transition-colors duration-500 ${on ? 'text-[#b08d57]' : 'text-[#10231a]/35'}`}>{pt.n}</span>
                <span className={`${DISPLAY} text-[1.6rem] font-normal leading-tight transition-colors duration-500 sm:text-[1.8rem] ${on ? 'text-[#10231a]' : 'text-[#10231a]/45 group-hover:text-[#10231a]/75'}`}>{pt.title}</span>
                <span aria-hidden="true" className={`text-[18px] text-[#b08d57] transition-transform duration-500 ${on ? 'rotate-45' : ''}`}>+</span>
              </button>
              <div id={`why-point-${i}`} aria-hidden={!on} className={`grid transition-[grid-template-rows] duration-700 ease-[cubic-bezier(0.2,0.7,0.1,1)] ${on ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <p className="pb-7 pl-[3.75rem] pr-6 text-[14.5px] leading-relaxed text-[#10231a]/65">{pt.text}</p>
                </div>
              </div>
              {on && running && (
                <span aria-hidden="true" className="absolute -bottom-px left-0 h-px w-full">
                  <span key={active} className={`${s.fill} block h-full bg-[#b08d57]`} style={{ ['--len' as string]: `${STEP_MS}ms` } as React.CSSProperties} />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
