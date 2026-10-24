'use client';

import React from 'react';
import { BellRing, Gift, QrCode, Star } from 'lucide-react';
import { PhoneDeck } from '@/components/landing-shots/PhoneDeck';
import type { VideoId } from '@/lib/landing/videos';
import { Reveal } from '@/components/vibers/Reveal';
import { DISPLAY } from '@/components/vibers/vibers-fonts';
import { CONTAINER, DEMO_NOTE, H2, KICKER_LIGHT, LEAD_LIGHT, SECTION, TURN_LIGHT } from '../qc-brand';
import { useAutoStep } from '../useAutoStep';
import s from '@/components/vibers/luxe.module.css';

const SCREENS: { id: VideoId; title: string; text: string }[] = [
  { id: 'guest-menu', title: 'A menu that feels like the venue', text: 'Your dishes as photographs, your top picks first, veg marks, add-ons and a tray that fills as they tap.' },
  { id: 'guest-vibey', title: 'Vibey takes the order', text: 'Guests type what they feel like, in their own language. Vibey fills the tray and suggests what to share.' },
  { id: 'guest-tracker', title: 'Every dish, tracked live', text: 'From received to cooking to ready, then the bill on the phone and 7% back in the guest’s wallet.' },
  { id: 'guest-lounge', title: 'The lounge wall', text: 'Guests leave memory postcards for the venue’s next guests, and come back to see them.' },
];
const IDS = SCREENS.map((x) => x.id);
const STEP_MS = 8000;

const PERKS = [
  { icon: QrCode, label: 'Nothing to install' },
  { icon: BellRing, label: 'Waiter, chef or bill in one tap' },
  { icon: Gift, label: '7% wallet cashback' },
  { icon: Star, label: 'Reviews and the photo vault' },
];

/** The guest side, Vibers Connect: one phone playing real recordings, with the four moments down the side taking turns. */
export function GuestSection() {
  const { ref, active, choose, running, inView, calm } = useAutoStep(SCREENS.length, () => STEP_MS);

  return (
    <section id="guests" aria-labelledby="guests-title" className={`${SECTION} ${s.grain} overflow-hidden bg-[#0f2a1e] text-[#f6f3ec]`}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_20%_40%,rgba(217,193,147,0.12),transparent_70%)]" />
      <div ref={ref} className={`${CONTAINER} relative grid items-center gap-14 lg:grid-cols-[1fr_1.05fr]`}>
        <div className="order-2 flex justify-center lg:order-1">
          <div className="relative">
            <span aria-hidden="true" className="absolute -inset-10 rounded-full bg-[#d9c193]/10 blur-3xl" />
            <PhoneDeck ids={IDS} active={SCREENS[active].id} live={inView && !calm} className="relative w-[250px] sm:w-[280px]" />
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <Reveal><p className={KICKER_LIGHT}>Vibers Connect, for your guests</p></Reveal>
          <Reveal index={1}><h2 id="guests-title" className={`${DISPLAY} ${H2}`}>Your guests get <em className={TURN_LIGHT}>Vibers Connect.</em></h2></Reveal>
          <Reveal index={2}><p className={`${LEAD_LIGHT} mt-6`}>Guests never see the Quad Computing name, only your venue, your menu and the people sharing the room tonight.</p></Reveal>

          <ol className="mt-10 border-t border-[#f6f3ec]/10">
            {SCREENS.map((x, i) => (
              <li key={x.id} className="border-b border-[#f6f3ec]/10">
                <button type="button" aria-expanded={i === active} onClick={() => choose(i)}
                  className="group relative w-full py-5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d9c193]">
                  <span className={`${DISPLAY} flex items-baseline gap-3 text-[1.45rem] leading-tight transition-colors duration-500 ${i === active ? 'text-[#f6f3ec]' : 'text-[#f6f3ec]/45 group-hover:text-[#f6f3ec]/75'}`}>
                    <span className="text-[1rem] italic text-[#d9c193]">{String(i + 1).padStart(2, '0')}</span>{x.title}
                  </span>
                  <span className={`grid transition-[grid-template-rows] duration-500 ${i === active ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <span className="overflow-hidden"><span className="block pl-9 pt-2 text-[14px] leading-relaxed text-[#f6f3ec]/65">{x.text}</span></span>
                  </span>
                  <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-px overflow-hidden">
                    {i === active && running && <span key={`bar-${active}`} className={`${s.fill} block h-full bg-[#d9c193]`} style={{ ['--len' as string]: `${STEP_MS}ms` } as React.CSSProperties} />}
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PERKS.map((p) => (
              <li key={p.label} className="rounded-2xl border border-[#f6f3ec]/10 bg-[#f6f3ec]/[0.04] p-3.5 text-[12px] leading-snug text-[#f6f3ec]/80">
                <p.icon aria-hidden="true" className="mb-2 h-4 w-4 text-[#d9c193]" />{p.label}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[11px] text-[#f6f3ec]/40">{DEMO_NOTE}</p>
        </div>
      </div>
    </section>
  );
}
