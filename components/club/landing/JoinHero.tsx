'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { AURA, AURA_TEXT } from '@/components/club/theme';
import { DISPLAY } from '@/components/vibers/vibers-fonts';
import { LiveBubbles } from './LiveBubbles';

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
    <section className="mx-auto grid max-w-6xl items-center gap-6 px-4 pb-10 pt-10 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#be185d]">By invitation of the vibe</p>
        <h1 className={`${DISPLAY} mt-3 text-[44px] leading-[1.02] tracking-tight sm:text-6xl`}>
          Vibers <em className={`${AURA_TEXT} pr-1`}>Club</em>
        </h1>
        <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-[#2a1250]/70 sm:text-[17px]">
          A verified, application-only club for travellers, nomads and creators. Meet people who are actually here,
          plan trips and nights out together, and book partner stays with your money held safely in escrow.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link href="/club/apply" className={`inline-flex h-12 items-center gap-2 rounded-full ${AURA} px-6 text-sm font-semibold text-white shadow-[0_14px_34px_-14px_rgba(255,46,136,0.9)] transition hover:brightness-105`}>
            Apply for your Viber Pass <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
          <Link href="/club" className="inline-flex h-12 items-center rounded-full border border-[#2a1250]/15 bg-white px-6 text-sm font-semibold hover:bg-[#2a1250]/[0.04]">
            I am a member
          </Link>
        </div>
        <p className="mt-4 text-xs text-[#2a1250]/50">18+ only · verified phone · one Vibers account for every property</p>
      </div>
      <LiveBubbles />
    </section>
  );
}
