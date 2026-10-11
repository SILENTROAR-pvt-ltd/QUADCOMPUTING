'use client';

import Link from 'next/link';
import { ClubShell } from '@/components/club/ClubShell';
import { useClub } from '@/components/club/club-context';
import { StoriesRail } from '@/components/club/home/StoriesRail';
import { LiveGrid } from '@/components/club/home/LiveGrid';
import { UpcomingPlans } from '@/components/club/home/UpcomingPlans';
import { DISPLAY } from '@/components/vibers/vibers-fonts';

function Home() {
  const { me } = useClub();
  const name = me.profile?.alias || me.viberId || 'Viber';
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#be185d]">Club home</p>
          <h1 className={`${DISPLAY} mt-1 text-3xl sm:text-4xl`}>Hey {name}, <em>who&apos;s around?</em></h1>
        </div>
        <div className="flex gap-2">
          <Link href="/club/chat" className="inline-flex h-10 items-center rounded-full border border-[#2a1250]/15 bg-white px-4 text-sm font-semibold">Club chat</Link>
          <Link href="/club/events/new" className="inline-flex h-10 items-center rounded-full bg-[#7c3aed] px-4 text-sm font-semibold text-white">Host a plan</Link>
        </div>
      </div>
      <StoriesRail />
      <LiveGrid />
      <UpcomingPlans />
    </div>
  );
}

export default function ClubHomePage() {
  return <ClubShell><Home /></ClubShell>;
}
