'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { BrowserShot } from '@/components/landing-shots/ShotFrames';
import { TOUR_STEPS } from './tour-steps';
import { Reveal } from '@/components/vibers/Reveal';
import { DISPLAY } from '@/components/vibers/vibers-fonts';
import { CONTAINER, DEMO_NOTE, H2, KICKER_LIGHT, LEAD_LIGHT, SECTION, TURN_LIGHT } from '../qc-brand';
import { useAutoStep } from '../useAutoStep';
import s from '@/components/vibers/luxe.module.css';

const STEP_MS = 6500;

/**
 * The control centre, A to Z, as one window: the steps down the left take turns (a gold bar fills under the running one),
 * the real screen for it fades in on the right, with what it answers for the owner. Choosing a step holds it.
 */
export function TourSection() {
  const { ref, active, choose, running } = useAutoStep(TOUR_STEPS.length, () => STEP_MS, 0.25);
  const step = TOUR_STEPS[active];

  return (
    <section id="tour" aria-labelledby="tour-title" className={`${SECTION} ${s.grain} overflow-hidden bg-[#0c0f0d] text-[#f6f3ec]`}>
      <div className={CONTAINER}>
        <div className="max-w-2xl">
          <Reveal><p className={KICKER_LIGHT}>The control centre</p></Reveal>
          <Reveal index={1}><h2 id="tour-title" className={`${DISPLAY} ${H2}`}>Every answer an owner needs, <em className={TURN_LIGHT}>A to Z.</em></h2></Reveal>
          <Reveal index={2}><p className={`${LEAD_LIGHT} mt-6`}>Real Quad Computing screens with a sample café&apos;s data. Every number on them comes from the same maths your venue&apos;s numbers will.</p></Reveal>
        </div>

        <div ref={ref} className="mt-14 grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)] lg:gap-12">
          <ol className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
            {TOUR_STEPS.map((t, i) => (
              <li key={t.id} className="shrink-0 lg:shrink">
                <button type="button" aria-pressed={i === active} onClick={() => choose(i)}
                  className={`group relative w-full rounded-2xl px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d9c193] lg:py-3.5 ${i === active ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}>
                  <span className="flex items-center gap-3">
                    <span className={`${DISPLAY} grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[15px] transition-colors ${i === active ? 'border-[#d9c193] text-[#d9c193]' : 'border-white/15 text-[#f6f3ec]/50'}`}>{t.letter}</span>
                    <span className={`whitespace-nowrap text-[14px] font-medium transition-colors lg:whitespace-normal ${i === active ? 'text-[#f6f3ec]' : 'text-[#f6f3ec]/55 group-hover:text-[#f6f3ec]/80'}`}>{t.title}</span>
                  </span>
                  <span aria-hidden="true" className="absolute inset-x-4 bottom-0 hidden h-px overflow-hidden lg:block">
                    {i === active && running && <span key={`bar-${active}`} className={`${s.fill} block h-full bg-[#d9c193]`} style={{ ['--len' as string]: `${STEP_MS}ms` } as React.CSSProperties} />}
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <div className="min-w-0">
            <div key={step.id} className={s.fadeUp}>
              <BrowserShot id={step.shot} url={`quadcomputing.app · ${step.url}`} crop={step.crop} className="!border-white/10" />
              <div className="mt-7 grid gap-6 md:grid-cols-[1fr_1.2fr]">
                <div>
                  <h3 className={`${DISPLAY} text-[1.9rem] font-light leading-tight`}>{step.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-[#f6f3ec]/65">{step.lead}</p>
                </div>
                <ul className="space-y-2.5">
                  {step.points.map((p) => (
                    <li key={p} className="flex items-start gap-3 text-[13.5px] leading-relaxed text-[#f6f3ec]/85">
                      <Check aria-hidden="true" className="mt-1 h-3.5 w-3.5 shrink-0 text-[#d9c193]" /> {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-6 text-right text-[11px] text-[#f6f3ec]/40">{DEMO_NOTE}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
