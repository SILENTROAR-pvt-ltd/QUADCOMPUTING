'use client';

import { UserRound } from 'lucide-react';
import { ClubShell } from '@/components/club/ClubShell';
import { Screen } from '@/components/club/nav/Screen';
import { MyProfile } from '@/components/club/profile/MyProfile';

export default function PassPage() {
  return (
    <ClubShell>
      <Screen title="Profile" icon={UserRound} width="feed">
        <MyProfile />
      </Screen>
    </ClubShell>
  );
}
