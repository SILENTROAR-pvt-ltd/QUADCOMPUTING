import React from 'react';
import Link from 'next/link';
import { ArrowRight, Play } from 'lucide-react';
import { LivePhone } from '@/components/landing-shots/LivePhone';
import { PAYG_BILL_FEE, SETUP_FEE } from '@/lib/services/wallet/plans';
import { DISPLAY } from '@/components/vibers/vibers-fonts';
import { BTN_GHOST_LIGHT, BTN_IVORY, CONTAINER, DEMO_NOTE, KICKER_LIGHT } from '../qc-brand';
import { HeroStage } from './HeroStage';
import { HeroTicker } from './HeroTicker';
import { Spotlight } from './Spotlight';
import s from '@/components/vibers/luxe.module.css';

const FACTS = [
  { value: '15', label: 'workspaces, one login' },
  { value: '0%', label: 'commission on your sales' },
  { value: `₹${SETUP_FEE}`, label: 'setup, once' },
];

const delay = (d: number) => ({ ['--d' as string]: `${d}s` }) as React.CSSProperties;

/** The first screen: the promise, two ways in, and the product itself running beside it, with the floor's live ribbon under. */
export function QcHero() {
  return (
    <section aria-labelledby="hero-title" className={`${s.grain} relative isolate overflow-hidden bg-[#0c0f0d] text-[#f6f3ec]`}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_75%_10%,rgba(176,141,87,0.22),transparent_70%),radial-gradient(40%_40%_at_0%_100%,rgba(15,42,30,0.7),transparent_70%)]" />
      <Spotlight />
      <div className={`${CONTAINER} grid gap-14 pb-16 pt-28 sm:pt-32 lg:grid-cols-[0.9fr_1.15fr] lg:items-center lg:gap-16 lg:pb-24`}>
        <div>
          <p className={`${KICKER_LIGHT} ${s.enter}`} style={delay(0)}>The operating system for hospitality</p>
          <h1 id="hero-title" className={`${DISPLAY} mt-6 text-[2.9rem] font-light leading-[1.02] tracking-[-0.01em] sm:text-[4rem] lg:text-[4.6rem]`}>
            <span className={`${s.enter} block`} style={delay(0.12)}>Run the whole house</span>
            <em className={`${s.enter} block italic text-[#d9c193]`} style={delay(0.28)}>from one screen.</em>
          </h1>
          <p className={`${s.enter} mt-7 max-w-xl text-[15.5px] leading-[1.85] text-[#f6f3ec]/70 sm:text-[16.5px]`} style={delay(0.42)}>
            Billing, tables, kitchen tickets, rooms, delivery, stock, staff and a real profit and loss, on the phones and laptops
            you already own. Your guests order straight from the table on <strong className="font-semibold text-[#f6f3ec]">Vibers Connect</strong>.
          </p>
          <div className={`${s.enter} mt-9 flex flex-col gap-3 sm:flex-row`} style={delay(0.55)}>
            <Link href="/onboarding/host" className={BTN_IVORY}>Start with ₹{PAYG_BILL_FEE} a bill <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
            <a href="#live-flow" className={BTN_GHOST_LIGHT}><Play aria-hidden="true" className="h-4 w-4" /> See it work</a>
          </div>
          <dl className={`${s.enter} mt-12 grid max-w-md grid-cols-3 gap-4 border-t border-white/10 pt-6`} style={delay(0.68)}>
            {FACTS.map((f) => (
              <div key={f.label}>
                <dt className="sr-only">{f.label}</dt>
                <dd className={`${DISPLAY} text-[2rem] leading-none text-[#d9c193]`}>{f.value}</dd>
                <dd aria-hidden="true" className="mt-2 text-[12px] leading-snug text-[#f6f3ec]/55">{f.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className={`${s.enter} relative`} style={delay(0.35)}>
          <HeroStage />
          <div className="absolute -bottom-10 -left-8 hidden xl:block">
            <LivePhone id="guest-menu" className="w-[150px] drop-shadow-[0_30px_40px_rgba(0,0,0,0.6)]" startDelayMs={700} />
          </div>
          <p className="mt-3 text-right text-[11px] text-[#f6f3ec]/40">{DEMO_NOTE}</p>
        </div>
      </div>
      <HeroTicker />
    </section>
  );
}
