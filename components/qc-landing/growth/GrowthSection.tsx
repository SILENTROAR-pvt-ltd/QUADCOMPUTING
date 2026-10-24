'use client';

import React from 'react';
import { VIDEOS } from '@/lib/landing/videos';
import { PhoneDeck } from '@/components/landing-shots/PhoneDeck';
import { Reveal } from '@/components/vibers/Reveal';
import { DISPLAY } from '@/components/vibers/vibers-fonts';
import { CONTAINER, DEMO_NOTE, H2, KICKER, LEAD, SECTION, TURN } from '../qc-brand';
import { useAutoStep } from '../useAutoStep';
import { BrowserWindow, StageVideo } from '../StageVideo';
import { LEVERS } from './growth-levers';
import s from '@/components/vibers/luxe.module.css';

const PHONES = LEVERS.map((l) => l.phone);

/**
 * The tools that bring guests in, not just bill them. For each one, both sides at once: the venue's portal (a real
 * recording) with the guest's phone (a real recording) in front of it, and the four beats from the venue's tap to a guest
 * through the door. The levers take turns; choosing one holds it.
 */
export function GrowthSection() {
  const { ref, active, choose, running, inView, calm } = useAutoStep(LEVERS.length, (i) => LEVERS[i].ms, 0.25);
  const lever = LEVERS[active];
  const v = VIDEOS[lever.video];
  const live = inView && !calm;

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

          <div className="mt-10 grid items-start gap-12 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-14">
            <div role="tabpanel" aria-label={lever.label} className="relative lg:pb-10 lg:pr-16">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.26em] text-[#0c0f0d]/50">What you see · Quad Computing</p>
              <div key={lever.id} className={s.fadeUp}>
                <BrowserWindow url={lever.url} ratio={v.width / v.height}><StageVideo id={lever.video} play={live} /></BrowserWindow>
              </div>
              <div className="mx-auto mt-8 w-[200px] lg:absolute lg:-bottom-6 lg:right-0 lg:mt-0 lg:w-[180px]">
                <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.26em] text-[#8a6d3f]">What your guest sees</p>
                <PhoneDeck ids={PHONES} active={lever.phone} live={live} className="w-full drop-shadow-[0_30px_40px_rgba(12,15,13,0.35)]" />
              </div>
            </div>

            <div key={`copy-${lever.id}`} className={s.fadeUp}>
              <h3 className={`${DISPLAY} text-[2.1rem] font-light leading-tight`}>{lever.title}</h3>
              <p className="mt-3 text-[14.5px] leading-relaxed text-[#0c0f0d]/65">{lever.lead}</p>
              <ol className="relative mt-8 space-y-5 before:absolute before:bottom-4 before:left-[19px] before:top-4 before:w-px before:bg-[#b08d57]/40">
                {lever.steps.map((st, i) => (
                  <li key={st.text} className="relative flex items-start gap-4">
                    <span className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border ${st.who === 'You' ? 'border-[#0c0f0d] bg-[#0c0f0d] text-[#d9c193]' : 'border-[#b08d57] bg-[#fbf9f4] text-[#8a6d3f]'}`}>
                      <st.icon aria-hidden="true" className="h-4 w-4" />
                    </span>
                    <span className="pt-1">
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-[#0c0f0d]/45">{String(i + 1).padStart(2, '0')} · {st.who}</span>
                      <span className="mt-0.5 block text-[15px] font-medium leading-snug">{st.text}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-8 inline-flex rounded-full border border-[#0c0f0d]/10 px-3 py-1.5 text-[11.5px] text-[#0c0f0d]/60">On {lever.plans}</p>
            </div>
          </div>
          <p className="mt-6 text-[11px] text-[#0c0f0d]/45">{DEMO_NOTE}</p>
        </div>
      </div>
    </section>
  );
}
