'use client';

import { useParams } from 'next/navigation';
import { UserRound } from 'lucide-react';
import { ClubShell } from '@/components/club/ClubShell';
import { Screen } from '@/components/club/nav/Screen';
import { MemberProfile } from '@/components/club/profile/MemberProfile';

export default function MemberPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <ClubShell>
      <Screen title="Profile" icon={UserRound} back="/club/community" width="feed">
        <MemberProfile id={id} />
      </Screen>
    </ClubShell>
  );
}
