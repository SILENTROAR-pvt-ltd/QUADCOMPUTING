'use client';

import Link from 'next/link';
import { ArrowRight, Globe, MessagesSquare } from 'lucide-react';
import { ClubShell } from '@/components/club/ClubShell';
import { Screen } from '@/components/club/nav/Screen';
import { LiveGrid } from '@/components/club/community/LiveGrid';
import { CLUB_DISPLAY } from '@/components/club/fonts';
import { DriftPhoto } from '@/components/club/LivePhotos';
import { photoUrl } from '@/components/club/photos';

function ClubChatCard() {
  return (
    <Link href="/club/chat" className="group relative mb-8 block h-52 overflow-hidden rounded-[32px] shadow-[0_24px_48px_-30px_rgba(20,38,27,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17301f]/50 sm:h-60">
      <DriftPhoto src={photoUrl('1529156069898-49953e39b3ac', 1400)} className="absolute inset-0" />
      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#17301f]/90 via-[#17301f]/55 to-transparent" />
      <span className="absolute inset-y-0 left-0 flex max-w-md flex-col justify-center p-6 text-white sm:p-8">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-[#c8da4a] text-[#14261b]"><MessagesSquare aria-hidden="true" className="h-5 w-5" /></span>
        <span className={`${CLUB_DISPLAY} mt-3 text-[30px] font-semibold leading-tight sm:text-4xl`}>The club <em className="font-medium text-[#e2ee9a]">chat</em></span>
        <span className="mt-1 text-sm text-white/85">One room, every approved member. Ask, plan, meet up.</span>
      </span>
      <span className="absolute bottom-5 right-5 grid h-11 w-11 place-items-center rounded-full bg-white text-[#14261b] transition group-hover:translate-x-1"><ArrowRight aria-hidden="true" className="h-5 w-5" /></span>
    </Link>
  );
}

export default function CommunityPage() {
  return (
    <ClubShell>
      <Screen title="Community" icon={Globe} width="wide">
        <ClubChatCard />
        <LiveGrid />
      </Screen>
    </ClubShell>
  );
}
