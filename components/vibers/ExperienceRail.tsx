'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Reveal } from './Reveal';
import { ExperienceCard } from './ExperienceCard';
import { EXPERIENCES, VIBES, type Vibe } from './vibers-experiences';
import s from './luxe.module.css';

type Filter = 'All' | Vibe;
const count = (f: Filter) => (f === 'All' ? EXPERIENCES.length : EXPERIENCES.filter((e) => e.vibe === f).length);

/**
 * The experiences as a swipeable rail of photo cards, with a vibe filter. Choosing a vibe slides the matching cards in
 * one after another and takes the rail back to its start; a gold line below follows the reader along the rail, and on
 * wider screens two arrows page through it.
 */
export function ExperienceRail() {
  const [filter, setFilter] = useState<Filter>('All');
  const [round, setRound] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const shown = filter === 'All' ? EXPERIENCES : EXPERIENCES.filter((e) => e.vibe === filter);
  const rail = () => wrap.current?.querySelector('ul') ?? null;

  // Re-measured after a filter change, since the rail's length changes with it.
  useEffect(() => {
    const el = wrap.current?.querySelector('ul');
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = el.scrollWidth - el.clientWidth;
      const seen = max > 0 ? (el.scrollLeft + el.clientWidth) / el.scrollWidth : 1;
      bar.current?.style.setProperty('transform', `scaleX(${seen.toFixed(3)})`);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { el.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (frame) cancelAnimationFrame(frame); };
  }, [filter]);

  const choose = (f: Filter) => {
    if (f === filter) return;
    setFilter(f);
    setRound((r) => r + 1);
    rail()?.scrollTo({ left: 0, behavior: 'smooth' });
  };
  const page = (dir: 1 | -1) => {
    const el = rail();
    const card = el?.firstElementChild as HTMLElement | null;
    if (el && card) el.scrollBy({ left: dir * (card.offsetWidth + 16) * Math.max(1, Math.floor(el.clientWidth / card.offsetWidth) - 1), behavior: 'smooth' });
  };

  return (
    <div ref={wrap} data-rail="">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div role="group" aria-label="Filter experiences by vibe" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {(['All', ...VIBES] as Filter[]).map((f) => (
            <button key={f} type="button" aria-pressed={f === filter} onClick={() => choose(f)}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-[12.5px] font-semibold tracking-[0.04em] transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f2a1e] ${
                f === filter ? 'border-[#0f2a1e] bg-[#0f2a1e] text-[#f5f1e8]' : 'border-[#10231a]/15 text-[#10231a]/70 hover:border-[#10231a]/40'}`}>
              {f}<span className={`text-[10.5px] ${f === filter ? 'text-[#d9c193]' : 'text-[#10231a]/40'}`}>{count(f)}</span>
            </button>
          ))}
        </div>
        <div className="hidden gap-2 sm:flex">
          {([-1, 1] as const).map((d) => (
            <button key={d} type="button" onClick={() => page(d)} aria-label={d < 0 ? 'Previous experiences' : 'Next experiences'}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#10231a]/20 text-[#10231a] transition-colors duration-300 hover:border-[#10231a] hover:bg-[#0f2a1e] hover:text-[#f5f1e8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f2a1e]">
              <span aria-hidden="true">{d < 0 ? '←' : '→'}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Room above and below for the cards' drift and their staggered heights. */}
      <Reveal as="ul" stagger className="no-scrollbar -mx-4 mt-2 flex snap-x snap-mandatory scroll-px-4 items-start gap-5 overflow-x-auto px-4 pb-10 pt-8 sm:mx-0 sm:scroll-px-0 sm:px-0 lg:gap-6">
        {shown.map((e, i) => (
          <li key={e.title} style={{ ['--i' as string]: i } as React.CSSProperties}
            className={`${round ? (round % 2 ? s.swapA : s.swapB) : ''} w-[70%] shrink-0 snap-start sm:w-[40%] lg:w-[calc((100%-4.5rem)/4)]`}>
            <ExperienceCard e={e} i={i} />
          </li>
        ))}
      </Reveal>
      <div aria-hidden="true" className="mt-5 h-px w-full bg-[#10231a]/10">
        <span ref={bar} className="block h-full origin-left bg-[#b08d57] transition-transform duration-300 ease-out" style={{ transform: 'scaleX(0.3)' }} />
      </div>
    </div>
  );
}
