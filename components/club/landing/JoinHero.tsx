'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { CLUB_DISPLAY } from '../fonts';
import { FOCUS } from '../ui';
import { LivePhotos } from '../LivePhotos';
import { SLIDESHOW } from '../photos';
import { LiveBubbles } from './LiveBubbles';
import styles from '../club.module.css';

export const CAMPAIGN_KEY = 'vc_club_campaign';

/** Keeps the QR campaign (?src=) so the application can credit it. */
function useCampaign(src: string | null) {
  useEffect(() => {
    if (src && /^[a-z0-9_-]{3,40}$/.test(src)) {
      try { localStorage.setItem(CAMPAIGN_KEY, src); } catch {}
    }
  }, [src]);
}

export function JoinHero({ src }: { src: string | null }) {
  useCampaign(src);
  return (
    <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:pt-14">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#3c6b2b]">By invitation of the vibe</p>
        <h1 className={`${CLUB_DISPLAY} mt-4 text-[48px] font-semibold leading-[1.02] tracking-tight sm:text-[68px]`}>
          Travel with people who are <em className="font-medium text-[#3c6b2b]">actually there</em>
        </h1>
        <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-[#14261b]/70 sm:text-[17px]">
          Vibers Club is a verified, application-only club for travellers, nomads and creators. Post your plans, see whose trips
          overlap with yours, join in a tap, and book partner stays with your money held safely in escrow.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/club/apply" className={`group inline-flex h-14 items-center gap-2 rounded-full bg-[#17301f] pl-7 pr-2 text-sm font-semibold text-[#f6f4ec] shadow-[0_18px_36px_-16px_rgba(23,48,31,0.8)] transition hover:bg-[#22432c] ${FOCUS}`}>
            Apply for your Club Visa
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#c8da4a] text-[#14261b] transition group-hover:translate-x-0.5"><ArrowRight aria-hidden="true" className="h-4 w-4" /></span>
          </Link>
          <Link href="/club" className={`inline-flex h-14 items-center rounded-full bg-white px-7 text-sm font-semibold shadow-[0_10px_26px_-18px_rgba(20,38,27,0.6)] ring-1 ring-[#14261b]/[0.06] transition hover:bg-[#fbfaf6] ${FOCUS}`}>
            I am a member
          </Link>
        </div>
        <p className="mt-5 flex items-center gap-2 text-xs text-[#14261b]/60"><ShieldCheck aria-hidden="true" className="h-4 w-4 text-[#3c6b2b]" /> 18+ only · verified phone · one Vibers account for every property</p>
      </div>
      <div className="relative">
        <LivePhotos photos={SLIDESHOW} dots className="h-[480px] rounded-[40px] shadow-[0_40px_80px_-40px_rgba(20,38,27,0.7)] sm:h-[580px]">
          {(p) => (
            <>
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10" />
              <div key={p.id} className={`${styles.captionIn} absolute inset-x-6 bottom-12 text-white`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/85">{p.country}</p>
                <p className={`${CLUB_DISPLAY} mt-1 text-[34px] font-semibold leading-tight sm:text-[42px]`}>{p.place}</p>
              </div>
            </>
          )}
        </LivePhotos>
        <div className="absolute -left-2 top-6 sm:-left-8"><LiveBubbles /></div>
      </div>
    </section>
  );
}
