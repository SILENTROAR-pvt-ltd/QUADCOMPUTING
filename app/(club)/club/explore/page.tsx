'use client';

import Link from 'next/link';
import { Building2, Sparkles } from 'lucide-react';
import { ClubShell } from '@/components/club/ClubShell';
import { Screen } from '@/components/club/nav/Screen';
import { FOCUS } from '@/components/club/ui';
import { CreateMenu } from '@/components/club/explore/CreateMenu';
import { ExploreScreen } from '@/components/club/explore/ExploreScreen';

const actions = (
  <>
    <CreateMenu />
    <Link href="/club/properties" aria-label="Verified stays" title="Verified stays"
      className={`grid h-11 w-11 place-items-center rounded-full bg-white text-[#14261b] shadow-[0_6px_18px_-12px_rgba(20,38,27,0.6)] ring-1 ring-[#14261b]/[0.06] ${FOCUS}`}>
      <Building2 aria-hidden="true" className="h-5 w-5" />
    </Link>
  </>
);

export default function ExplorePage() {
  return (
    <ClubShell>
      <Screen title="Explore" icon={Sparkles} actions={actions} width="page">
        <ExploreScreen />
      </Screen>
    </ClubShell>
  );
}
