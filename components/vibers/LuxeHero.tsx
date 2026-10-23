import Link from 'next/link';
import React from 'react';
import { HeroReel } from './HeroReel';
import { BTN_GHOST_LIGHT, BTN_IVORY } from './vibers-brand';
import { DISPLAY, SCRIPT } from './vibers-fonts';
import s from './luxe.module.css';

const at = (d: number) => ({ ['--d' as string]: `${d}s` }) as React.CSSProperties;

/** The club's mark: a gold V inside a double ring, flanked by the year it began. */
function Emblem() {
  return (
    <div className={`${s.enter} flex items-center gap-4 text-[9.5px] font-semibold uppercase tracking-[0.4em] text-[#f5f1e8]/70`} style={at(0.15)}>
      <span>Est.</span>
      <span className="grid h-11 w-11 place-items-center rounded-full border border-[#d9c193]/75 outline outline-1 outline-offset-[3px] outline-[#d9c193]/25">
        <span className={`${DISPLAY} text-[22px] font-medium leading-none text-[#d9c193]`}>V</span>
      </span>
      <span>2026</span>
    </div>
  );
}

/**
 * The first thing anyone sees: the film, and over it the name set like a private club's (Garamond capitals with a
 * gold script signature), one line about the vibe, and two ways in.
 */
export function LuxeHero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate flex h-[100svh] min-h-[640px] items-center justify-center overflow-hidden text-[#f5f1e8]">
      <HeroReel />
      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-6 pb-16 pt-20 text-center">
        <Emblem />
        <p className={`${s.enter} mt-6 flex items-center gap-3 whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.26em] text-[#f5f1e8]/75 sm:text-[10px] sm:tracking-[0.36em]`} style={at(0.3)}>
          <span aria-hidden="true" className="hidden h-px w-10 bg-[#d9c193]/60 sm:block" />
          A Viber-cultured stay &amp; social club
          <span aria-hidden="true" className="hidden h-px w-10 bg-[#d9c193]/60 sm:block" />
        </p>
        <h1 id="hero-title" className={`${DISPLAY} ${s.enter} mt-6 [text-shadow:0_4px_32px_rgba(0,0,0,0.3)]`} style={at(0.45)}>
          <span className="block text-[clamp(2.9rem,7.2vw,5.6rem)] font-medium leading-[0.9] tracking-[0.12em]">VIBERS</span>
          <span className={`${SCRIPT} -mt-[0.12em] block text-[clamp(2rem,4.4vw,3.5rem)] font-normal leading-[1.15] text-[#d9c193]`}>Connect</span>
        </h1>
        <p className={`${DISPLAY} ${s.enter} mt-5 text-[1.25rem] font-light italic text-[#f5f1e8]/90 sm:text-[1.5rem]`} style={at(0.75)}>
          Live your vibe, unfiltered.
        </p>
        <div className={`${s.enter} mt-8 flex w-full max-w-xs flex-col justify-center gap-3 sm:w-auto sm:max-w-none sm:flex-row`} style={at(0.95)}>
          <Link href="/join" className={BTN_IVORY}>Join Vibers Club</Link>
          <a href="#welcome" className={BTN_GHOST_LIGHT}>Discover the vibe</a>
        </div>
      </div>
      <a href="#welcome" aria-label="Scroll to the story" className="absolute bottom-5 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-[9px] uppercase tracking-[0.32em] text-[#f5f1e8]/60 hover:text-[#f5f1e8] [@media(min-height:700px)]:flex">
        Scroll
        <span className="relative h-8 w-px overflow-hidden bg-white/20"><span className={`absolute inset-0 bg-[#d9c193] ${s.cue}`} /></span>
      </a>
    </section>
  );
}
