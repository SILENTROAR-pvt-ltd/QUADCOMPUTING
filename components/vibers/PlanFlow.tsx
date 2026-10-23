'use client';

import React, { useEffect, useRef, useState } from 'react';
import { PHOTOS } from './vibers-media';
import { DISPLAY } from './vibers-fonts';
import s from './luxe.module.css';

const STEPS = [
  { title: 'Create events', photo: PHOTOS.planEvents, plan: 'Rooftop sundowner · tonight, 8 PM · 9 going',
    text: 'Walk-arounds, club or party hopping, a coffee, a simple get-together, shared with the community around you.' },
  { title: 'Plan shared journeys', photo: PHOTOS.planJourney, plan: 'Hills road trip · 4 seats · split equally',
    text: 'Sponsored trips, equal-split tours or paid journeys, with Vibers joining as per their capacity.' },
  { title: 'Celebrate', photo: PHOTOS.planCelebrate, plan: 'Promotion party · lakeside · 12 going',
    text: 'Reunions, success and achievement parties, coffee meet-ups, or just a walk.' },
];
const STEP_MS = 5200;

/**
 * Creating your own plan, told as it happens: step 1 plays on a wide photo with a live plan card, then the flow moves on
 * to 2 and 3 by itself, a gold bar under each step showing the time left. Tapping a step jumps to it and hands control to
 * the reader. Without JavaScript or with reduced motion the first step simply stands.
 */
export function PlanFlow() {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const [touched, setTouched] = useState(false);
  const running = inView && !touched;

  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % STEPS.length), STEP_MS);
    return () => clearTimeout(t);
  }, [running, active]);

  const step = STEPS[active];
  return (
    <div ref={root}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-[2px] bg-[#0b1f16] sm:aspect-[16/8] lg:aspect-[21/9]">
        {STEPS.map((x, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={x.title} src={x.photo.src} alt={i === active ? x.photo.alt : ''} width={x.photo.width} height={x.photo.height} loading="lazy" decoding="async"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ${i === active ? `opacity-100 ${s.kenburns}` : 'opacity-0'}`} />
        ))}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,22,15,0.85)_0%,rgba(8,22,15,0.35)_55%,transparent_100%)]" />
        <p key={`plan-${active}`} className={`${s.fadeUp} absolute right-4 top-4 inline-flex max-w-[78%] items-center gap-2 rounded-full bg-[#f5f1e8]/95 px-3.5 py-1.5 text-[11px] font-semibold text-[#10231a] shadow-[0_10px_24px_-12px_rgba(0,0,0,0.5)] sm:right-6 sm:top-6`}>
          <span aria-hidden="true" className={`${s.pulse} h-1.5 w-1.5 shrink-0 rounded-full bg-[#b08d57]`} /><span className="truncate">{step.plan}</span>
        </p>
        <div key={`text-${active}`} className={`${s.fadeUp} absolute inset-x-0 bottom-0 max-w-xl p-6 text-[#f5f1e8] sm:p-10`}>
          <p className={`${DISPLAY} text-[1.1rem] italic text-[#d9c193]`}>{String(active + 1).padStart(2, '0')} / 03</p>
          <h3 className={`${DISPLAY} mt-1 text-[2rem] font-light leading-tight sm:text-[2.6rem]`}>{step.title}</h3>
          <p className="mt-2 hidden max-w-md text-[14px] leading-relaxed text-[#f5f1e8]/75 sm:block">{step.text}</p>
        </div>
      </div>

      <ol className="mt-5 grid grid-cols-3 gap-3 sm:gap-6">
        {STEPS.map((x, i) => (
          <li key={x.title}>
            <button type="button" aria-pressed={i === active} onClick={() => { setActive(i); setTouched(true); }}
              className="group w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d9c193]">
              <span aria-hidden="true" className="block h-[2px] w-full overflow-hidden bg-[#f5f1e8]/15">
                {i < active && <span className="block h-full w-full bg-[#d9c193]/60" />}
                {i === active && (running
                  ? <span key={`bar-${active}`} className={`${s.fill} block h-full bg-[#d9c193]`} style={{ ['--len' as string]: `${STEP_MS}ms` } as React.CSSProperties} />
                  : <span className="block h-full w-full bg-[#d9c193]" />)}
              </span>
              <span className={`${DISPLAY} mt-3 block text-[1.05rem] leading-tight transition-colors duration-500 sm:text-[1.35rem] ${i === active ? 'text-[#f5f1e8]' : 'text-[#f5f1e8]/45 group-hover:text-[#f5f1e8]/75'}`}>
                <span className="mr-2 italic text-[#d9c193]">{String(i + 1).padStart(2, '0')}</span>{x.title}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <p key={`mobile-${active}`} className={`${s.fadeUp} mt-4 text-[14px] leading-relaxed text-[#f5f1e8]/70 sm:hidden`}>{step.text}</p>
    </div>
  );
}
