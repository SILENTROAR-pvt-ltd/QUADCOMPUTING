'use client';

import { useParams } from 'next/navigation';
import { MapPin } from 'lucide-react';
import { ClubShell } from '@/components/club/ClubShell';
import { Screen } from '@/components/club/nav/Screen';
import { PlaceDetail } from '@/components/club/places/PlaceDetail';

export default function PlacePage() {
  const { id } = useParams<{ id: string }>();
  return (
    <ClubShell>
      <Screen title="Destination" icon={MapPin} back="/club/places" width="wide">
        <PlaceDetail id={id} />
      </Screen>
    </ClubShell>
  );
}
