'use client';

import { useParams } from 'next/navigation';
import { Zap } from 'lucide-react';
import { ClubShell } from '@/components/club/ClubShell';
import { Screen } from '@/components/club/nav/Screen';
import { MeetupDetail } from '@/components/club/explore/MeetupDetail';

export default function MeetupPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <ClubShell>
      <Screen title="Meetup" icon={Zap} back="/club/explore" width="feed">
        <MeetupDetail id={id} />
      </Screen>
    </ClubShell>
  );
}
