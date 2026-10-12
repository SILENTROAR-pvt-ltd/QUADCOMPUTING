'use client';

import { Suspense } from 'react';
import { MapPin } from 'lucide-react';
import { ClubShell } from '@/components/club/ClubShell';
import { Screen } from '@/components/club/nav/Screen';
import { RegionPlaces } from '@/components/club/places/RegionPlaces';
import { Spinner } from '@/components/club/ui';

export default function PlacesPage() {
  return (
    <ClubShell>
      <Screen title="Places" icon={MapPin} back="/club" width="wide">
        <Suspense fallback={<Spinner />}><RegionPlaces /></Suspense>
      </Screen>
    </ClubShell>
  );
}
