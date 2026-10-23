import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BODY, DISPLAY, SCRIPT } from '../vibers-fonts';
import s from './coming-soon.module.css';

// A portrait night photo (1152x2048): a car and a cargo plane in a dark hangar. Pinterest serves it at three widths.
const PHOTO = (size: 'originals' | '736x' | '236x') => `https://i.pinimg.com/${size}/a9/c2/e8/a9c2e8ab2e13bcfe478ff865a159dd90.jpg`;
export const CLUB_COMING_SOON_PHOTO = PHOTO('originals');
const at = (d: number) => ({ ['--d' as string]: `${d}s` }) as React.CSSProperties;

/**
 * Where every "Join the Club" leads while Vibers Club is being finished: one grainy night photograph (full screen on a
 * phone, standing in a dark glow on wider screens), "Arriving soon" in the centre, and a small way back home.
 */
export function ClubComingSoon() {
  return (
    <main className={`${BODY} relative isolate flex min-h-[100dvh] flex-col overflow-hidden bg-[#07090b] text-[#f5f1e8] antialiased selection:bg-[#d9c193] selection:text-[#10231a]`}>
      <div aria-hidden className="absolute inset-0 -z-30 overflow-hidden bg-[#07090b]">
        {/* eslint-disable-next-line @next/next/no-img-element -- a tiny copy, blurred into the glow either side of the photo on wide screens */}
        <img src={PHOTO('236x')} alt="" decoding="async" className={s.ambient} />
      </div>
      <div className={`${s.frame} -z-20`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- the photograph, served at the width the screen needs */}
        <img src={PHOTO('originals')} srcSet={`${PHOTO('736x')} 736w, ${PHOTO('originals')} 1152w`} sizes="(orientation: landscape) 57vh, 100vw" fetchPriority="high" decoding="async"
          alt="A black sports car with glowing headlights before a cargo plane in a dark hangar" className={`${s.photo} ${s.exposure} h-full w-full object-cover object-center`} />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"><div className={s.grain} /></div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(7,9,11,0.6)_0%,rgba(7,9,11,0.12)_28%,rgba(7,9,11,0.05)_55%,rgba(7,9,11,0.35)_80%,rgba(7,9,11,0.85)_100%)]" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_50%_45%,transparent_55%,rgba(7,9,11,0.5)_100%)]" />

      <header className="absolute inset-x-0 top-0 z-10 mx-auto flex h-[72px] w-full max-w-[1240px] items-center justify-center px-4 sm:justify-start sm:px-8">
        <Link href="/" aria-label="Vibers Connect home" className={`${s.rise} flex items-baseline gap-1.5`} style={at(0.1)}>
          <span className={`${DISPLAY} text-[20px] font-semibold tracking-[0.22em] sm:text-[22px]`}>VIBERS</span>
          <span className={`${SCRIPT} text-[22px] leading-none text-[#d9c193] sm:text-[24px]`}>Connect</span>
        </Link>
      </header>

      {/* The title in the very centre of the screen, over a soft pool of shade so it reads on any part of the photo. */}
      <section aria-labelledby="club-soon-title" className="relative flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
        <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[48vh] w-[110vw] max-w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(7,9,11,0.5),transparent)]" />
        <span aria-hidden className={`${s.glow} pointer-events-none absolute left-1/2 top-1/2 h-[34vh] w-[90vw] max-w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(217,193,147,0.2),transparent)]`} />
        <p className={`${s.rise} relative inline-flex items-center gap-3 text-[10.5px] font-semibold uppercase tracking-[0.36em] text-[#d9c193] before:h-px before:w-8 before:bg-[#d9c193]/80 after:h-px after:w-8 after:bg-[#d9c193]/80`} style={at(0.35)}>
          Vibers Club
        </p>
        <h1 id="club-soon-title" className={`${DISPLAY} ${s.rise} relative mt-[2.4vh] text-[length:min(12.5vw,10vh)] font-light leading-[0.98] tracking-[-0.01em] [text-shadow:0_2px_34px_rgba(8,22,15,0.6)]`} style={at(0.55)}>
          Arriving <em className={`${s.sheen} pr-1 font-normal italic`}>soon</em>
        </h1>
        <span aria-hidden className={`${s.line} relative mt-[2.6vh] block h-px w-24 bg-gradient-to-r from-transparent via-[#d9c193] to-transparent sm:w-32`} style={at(1)} />
      </section>

      <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+2.25rem)] flex justify-center sm:bottom-12">
        <Link href="/" className={`${s.rise} inline-flex items-center gap-2 border-b border-[#d9c193]/40 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.26em] text-[#f5f1e8]/80 transition-colors hover:border-[#d9c193] hover:text-[#f5f1e8]`} style={at(1.6)}>
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Return to Vibers Connect
        </Link>
      </div>
    </main>
  );
}
