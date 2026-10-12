'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CLUB_DISPLAY } from '../fonts';
import { Brand } from '../nav/Brand';
import { LivePhotos } from '../LivePhotos';
import { DESTINATIONS } from '../photos';

const CLOSING = [DESTINATIONS.moraine, DESTINATIONS.thailand, DESTINATIONS.mumbai];

/** The closing invitation over live photography, and the footer. */
export function JoinFooter() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <LivePhotos photos={CLOSING} interval={7000} className="rounded-[44px]">
          {() => (
            <div className="relative bg-gradient-to-r from-[#17301f]/90 via-[#17301f]/60 to-[#17301f]/20 px-7 py-16 text-white sm:px-14 sm:py-24">
              <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-[#e2ee9a]">Your trip, your people</p>
              <h2 className={`${CLUB_DISPLAY} mt-3 max-w-xl text-[42px] font-semibold leading-[1.02] sm:text-6xl`}>More trips, <em className="font-medium text-[#e2ee9a]">less stress</em></h2>
              <p className="mt-4 max-w-md text-[15px] text-white/85">Apply once. Get your Club Visa. Find your people at every Vibers property.</p>
              <Link href="/club/apply" className="group mt-8 inline-flex h-14 items-center gap-2 rounded-full bg-[#c8da4a] pl-7 pr-2 text-sm font-bold text-[#14261b] transition hover:bg-[#bccf3b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                Apply for your Club Visa
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#17301f] text-[#c8da4a] transition group-hover:translate-x-0.5"><ArrowRight aria-hidden="true" className="h-4 w-4" /></span>
              </Link>
            </div>
          )}
        </LivePhotos>
      </section>
      <footer className="border-t border-[#14261b]/[0.08]">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-8 text-sm text-[#14261b]/65 sm:flex-row sm:items-center sm:px-6">
          <Brand href="/join" />
          <p>Part of <Link href="/" className="font-semibold text-[#14261b] underline-offset-4 hover:underline">Vibers Connect</Link> · properties run on <Link href="/quad-computing" className="font-semibold text-[#14261b] underline-offset-4 hover:underline">Quad Computing</Link></p>
        </div>
      </footer>
    </>
  );
}
