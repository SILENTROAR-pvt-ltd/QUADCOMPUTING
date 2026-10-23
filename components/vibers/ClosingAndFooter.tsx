import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Reveal } from './Reveal';
import { PHOTOS } from './vibers-media';
import { BTN_GHOST_LIGHT, BTN_IVORY, CONTAINER, SITE } from './vibers-brand';
import { DISPLAY, SCRIPT } from './vibers-fonts';
import s from './luxe.module.css';

const DOORS = [
  { who: 'At a Vibers Connect point?', action: 'Scan your table or room QR', href: '/onboarding/guest' },
  { who: 'Run a venue with soul?', action: 'Partner with Vibers Connect', href: '/quad-computing' },
  { who: 'Already a partner?', action: 'Host login', href: '/auth/host' },
];

/** The last word, over a sky full of cloud: the welcome to Vibers Club, then the three other doors, then the footer. */
export function ClosingAndFooter() {
  const p = PHOTOS.clouds;
  return (
    <>
      <section aria-labelledby="closing-title" className="relative isolate flex min-h-[88svh] items-center overflow-hidden text-[#f5f1e8]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.src} alt="" width={p.width} height={p.height} loading="lazy" decoding="async" className={`${s.drift} absolute inset-0 -z-10 h-full w-full object-cover`} />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(8,22,15,0.35)_0%,rgba(8,22,15,0.45)_50%,rgba(8,22,15,0.85)_100%)]" />
        <div className={`${CONTAINER} py-28 text-center`}>
          <Reveal><p className={`${SCRIPT} text-[2.1rem] leading-none text-[#d9c193] sm:text-[2.6rem]`}>Welcome to</p></Reveal>
          <Reveal index={1}><h2 id="closing-title" className={`${DISPLAY} mt-3 text-[2.6rem] font-medium leading-[0.95] tracking-[0.12em] sm:text-[4rem]`}>VIBERS CLUB</h2></Reveal>
          <Reveal index={2}>
            <p className="mx-auto mt-7 max-w-xl text-[16px] leading-[1.8] text-[#f5f1e8]/80 sm:text-[17px]">
              A culture that goes beyond social media and the reel world. Where your vibe is welcome, understood and shared.
            </p>
          </Reveal>
          <Reveal index={3} className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/vibers-club" className={BTN_IVORY}>Join Vibers Club</Link>
            <a href="#welcome" className={BTN_GHOST_LIGHT}>Read it again</a>
          </Reveal>
          <Reveal index={4}><p className={`${DISPLAY} mt-8 text-[1.3rem] italic text-[#f5f1e8]/80`}>Find your people, and be yourself.</p></Reveal>
        </div>
      </section>

      <footer className="bg-[#0b1f16] text-[#f5f1e8]">
        <div className={`${CONTAINER} grid gap-px border-b border-[#f5f1e8]/10 py-14 sm:grid-cols-3`}>
          {DOORS.map((d) => (
            <Link key={d.href} href={d.href} className="group flex items-start justify-between gap-4 py-4 sm:px-6 sm:first:pl-0">
              <span>
                <span className="block text-[11px] font-semibold uppercase tracking-[0.26em] text-[#f5f1e8]/50">{d.who}</span>
                <span className={`${DISPLAY} mt-2 block text-[1.6rem] leading-tight`}>{d.action}</span>
              </span>
              <ArrowUpRight aria-hidden="true" className="mt-6 h-5 w-5 shrink-0 text-[#d9c193] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
        <div className={`${CONTAINER} flex flex-col gap-6 py-10 sm:flex-row sm:items-end sm:justify-between`}>
          <div>
            <p className="flex items-baseline gap-2"><span className={`${DISPLAY} text-[26px] font-semibold tracking-[0.22em]`}>VIBERS</span><span className={`${SCRIPT} text-[28px] text-[#d9c193]`}>Connect</span></p>
            <p className="mt-2 text-[13px] text-[#f5f1e8]/55">Find your vibe. Find your people. Find yourself.</p>
          </div>
          <div className="text-[13px] text-[#f5f1e8]/60 sm:text-right">
            <p>{SITE.domain} · <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-[#d9c193]">{SITE.handle}</a></p>
            <p className="mt-1">© {new Date().getFullYear()} {SITE.company}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
