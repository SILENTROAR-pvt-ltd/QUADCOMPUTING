'use client';

import { Suspense } from 'react';
import { MessageCircle } from 'lucide-react';
import { ClubShell } from '@/components/club/ClubShell';
import { Screen } from '@/components/club/nav/Screen';
import { Spinner } from '@/components/club/ui';
import { CommonRoom } from '@/components/club/room/CommonRoom';

export default function ClubHomePage() {
  return (
    <ClubShell>
      <Screen title="Common Room" icon={MessageCircle} width="feed">
        <Suspense fallback={<Spinner />}><CommonRoom /></Suspense>
      </Screen>
    </ClubShell>
  );
}
