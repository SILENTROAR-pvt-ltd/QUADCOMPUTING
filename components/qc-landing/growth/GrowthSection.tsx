'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { VIDEOS } from '@/lib/landing/videos';
import { Reveal } from '@/components/vibers/Reveal';
import { DISPLAY } from '@/components/vibers/vibers-fonts';
import { CONTAINER, DEMO_NOTE, H2, KICKER, LEAD, SECTION, TURN } from '../qc-brand';
import { useAutoStep } from '../useAutoStep';
import { BrowserWindow, StageVideo } from '../StageVideo';
import { LEVERS } from './growth-levers';
import { LiftSimulator } from './LiftSimulator';
import s from '@/components/vibers/luxe.module.css';

/**
 * The tools that bring guests in, not just bill them: events with an interested list, offers with redemption codes, and
 * services sold beyond the menu, each a real portal recording that takes its turn, then a calculator on the venue's own
 * numbers.
 */
export function GrowthSection() {
  const { ref, active, choose, running, inView, calm } = useAutoStep(LEVERS.length, (i) => LEVERS[i].ms, 0.25);
  const lever = LEVERS[active];
  const v = VIDEOS[lever.video];

  return (
    <section id="grow" aria-labelledby="grow-title" className={`${SECTION} bg-[#f6f3ec] text-[#0c0f0d]`}>
      <div className={CONTAINER}>
        <div className="max-w-3xl">
          <Reveal><p className={KICKER}>Grow your sales</p></Reveal>
          <Reveal index={1}><h2 id="grow-title" className={`${DISPLAY} ${H2}`}>Fill the quiet nights. <em className={TURN}>Sell beyond the menu.</em></h2></Reveal>
          <Reveal index={2}><p className={`${LEAD} mt-6`}>A till records the guests who walk in. Quad Computing brings more of them, and gives each one more to say yes to.</p></Reveal>
        </div>

        <div ref={ref} className="mt-12">
          <div role="tablist" aria-label="Ways to grow" className="grid grid-cols-3 gap-2 sm:gap-4">
            {LEVERS.map((l, i) => (
              <button key={l.id} type="button" role="tab" aria-selected={i === active} onClick={() => choose(i)}
                className={`group relative overflow-hidden rounded-2xl border px-3 py-3.5 text-left transition-all duration-500 sm:px-5 sm:py-4 ${i === active ? 'border-[#0c0f0d] bg-[#0c0f0d] text-[#f6f3ec]' : 'border-[#e6dfcf] bg-[#fbf9f4] text-[#0c0f0d]/70 hover:border-[#0c0f0d]/30'}`}>
                <span className="flex items-center gap-2.5 text-[13px] font-semibold sm:text-[14px]">
                  <l.icon aria-hidden="true" className={`h-4 w-4 shrink-0 ${i === active ? 'text-[#d9c193]' : 'text-[#8a6d3f]'}`} /> {l.label}
                </span>
                <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px]">
                  {i === active && running && <span key={`bar-${active}`} className={`${s.fill} block h-full bg-[#d9c193]`} style={{ ['--len' as string]: `${l.ms}ms` } as React.CSSProperties} />}
                </span>
              </button>
            ))}
          </div>

          <div key={lever.id} className={`${s.fadeUp} mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-12`}>
            <div role="tabpanel" aria-label={lever.label}>
              <BrowserWindow url={lever.url} ratio={v.width / v.height}><StageVideo id={lever.video} play={inView && !calm} /></BrowserWindow>
              <p className="mt-3 text-right text-[11px] text-[#0c0f0d]/45">{DEMO_NOTE}</p>
            </div>
            <div>
              <h3 className={`${DISPLAY} text-[2rem] font-light leading-tight`}>{lever.title}</h3>
              <p className="mt-3 text-[14.5px] leading-relaxed text-[#0c0f0d]/65">{lever.lead}</p>
              <ul className="mt-6 space-y-3">
                {lever.points.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-[14px] leading-relaxed text-[#0c0f0d]/85"><Check aria-hidden="true" className="mt-1 h-3.5 w-3.5 shrink-0 text-[#8a6d3f]" /> {p}</li>
                ))}
              </ul>
              <p className="mt-6 inline-flex rounded-full border border-[#0c0f0d]/10 px-3 py-1.5 text-[11.5px] text-[#0c0f0d]/60">On {lever.plans}</p>
            </div>
          </div>
        </div>

        <Reveal index={1}><div className="mt-16"><LiftSimulator /></div></Reveal>
      </div>
    </section>
  );
}
