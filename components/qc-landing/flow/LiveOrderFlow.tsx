'use client';

import React from 'react';
import { Building2, Smartphone } from 'lucide-react';
import { PhoneDeck } from '@/components/landing-shots/PhoneDeck';
import { Reveal } from '@/components/vibers/Reveal';
import { DISPLAY } from '@/components/vibers/vibers-fonts';
import { CONTAINER, DEMO_NOTE, H2, KICKER, LEAD, SECTION, TURN } from '../qc-brand';
import { useAutoStep } from '../useAutoStep';
import { FLOW_STEPS, type VenueView } from './flow-steps';
import { ConnectedPanel, KotPanel, SettlePanel } from './VenuePanels';
import { KitchenPanel, ReportPanel } from './KitchenReportPanels';
import s from '@/components/vibers/luxe.module.css';

const PANELS: Record<VenueView, () => React.ReactElement> = { connected: ConnectedPanel, kot: KotPanel, kitchen: KitchenPanel, settle: SettlePanel, report: ReportPanel };
const PHONES = Array.from(new Set(FLOW_STEPS.map((f) => f.phone)));

/**
 * One table's order told on both screens at once: the guest's phone (a real recording) on the left, the venue's screen on
 * the right, stepping by itself with a gold bar under each step. Tapping a step holds it.
 */
export function LiveOrderFlow() {
  const { ref, active, choose, running, inView, calm } = useAutoStep(FLOW_STEPS.length, (i) => FLOW_STEPS[i].ms);
  const step = FLOW_STEPS[active];
  const Panel = PANELS[step.view];

  return (
    <section id="live-flow" aria-labelledby="flow-title" className={`${SECTION} bg-[#f6f3ec] text-[#0c0f0d]`}>
      <div className={CONTAINER}>
        <div className="max-w-2xl">
          <Reveal><p className={KICKER}>How it flows</p></Reveal>
          <Reveal index={1}><h2 id="flow-title" className={`${DISPLAY} ${H2}`}>One order. <em className={TURN}>Both sides, live.</em></h2></Reveal>
          <Reveal index={2}><p className={`${LEAD} mt-6`}>Follow a table from the QR scan to the day&apos;s report. The guest&apos;s steps happen in Vibers Connect, the venue&apos;s in Quad Computing, in the same second.</p></Reveal>
        </div>

        <Reveal index={1}>
          <div ref={ref} className="mt-14 overflow-hidden rounded-[28px] bg-[#0c0f0d] p-4 sm:p-8 lg:p-10">
            <div className="grid items-center gap-8 lg:grid-cols-[260px_1fr] lg:gap-12">
              <div className="flex flex-col items-center">
                <p className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#d9c193]"><Smartphone aria-hidden="true" className="h-3.5 w-3.5" /> Guest · Vibers Connect</p>
                <PhoneDeck ids={PHONES} active={step.phone} live={inView && !calm} className="w-[210px] sm:w-[240px]" />
              </div>
              <div>
                <p className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#f6f3ec]/60"><Building2 aria-hidden="true" className="h-3.5 w-3.5" /> Venue · Quad Computing</p>
                <div className="rounded-[20px] bg-[#f4f3ee] p-3 sm:p-5">
                  <div key={active} className={`${s.fadeUp} min-h-[19rem]`}><Panel /></div>
                </div>
                <div key={`copy-${active}`} className={`${s.fadeUp} mt-6 grid gap-4 text-[14px] leading-relaxed sm:grid-cols-2`}>
                  <h3 className={`${DISPLAY} text-[1.7rem] font-light leading-tight text-[#f6f3ec] sm:col-span-2`}>{step.title}</h3>
                  <p className="text-[#f6f3ec]/75"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d9c193]">Guest</span>{step.guest}</p>
                  <p className="text-[#f6f3ec]/75"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.24em] text-[#f6f3ec]/50">Venue</span>{step.venue}</p>
                </div>
              </div>
            </div>

            <ol className="mt-10 grid grid-cols-5 gap-2 sm:gap-5">
              {FLOW_STEPS.map((f, i) => (
                <li key={f.title}>
                  <button type="button" aria-pressed={i === active} onClick={() => choose(i)}
                    className="group w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d9c193]">
                    <span aria-hidden="true" className="block h-[2px] w-full overflow-hidden bg-[#f6f3ec]/15">
                      {i < active && <span className="block h-full w-full bg-[#d9c193]/60" />}
                      {i === active && (running
                        ? <span key={`bar-${active}`} className={`${s.fill} block h-full bg-[#d9c193]`} style={{ ['--len' as string]: `${f.ms}ms` } as React.CSSProperties} />
                        : <span className="block h-full w-full bg-[#d9c193]" />)}
                    </span>
                    <span className={`${DISPLAY} mt-3 block text-[1rem] leading-tight transition-colors duration-500 sm:text-[1.2rem] ${i === active ? 'text-[#f6f3ec]' : 'text-[#f6f3ec]/40 group-hover:text-[#f6f3ec]/70'}`}>
                      <span className="mr-1.5 italic text-[#d9c193]">{String(i + 1).padStart(2, '0')}</span><span className="hidden sm:inline">{f.title}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
        <p className="mt-4 text-right text-[11px] text-[#0c0f0d]/45">{DEMO_NOTE}</p>
      </div>
    </section>
  );
}
