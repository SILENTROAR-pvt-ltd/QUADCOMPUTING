'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { ClubShell } from '@/components/club/ClubShell';
import { Screen } from '@/components/club/nav/Screen';
import { Spinner } from '@/components/club/ui';
import { PropertyDetail } from '@/components/club/properties/PropertyDetail';

function Detail() {
  const { id } = useParams<{ id: string }>();
  const eventId = useSearchParams()?.get('event') || null;
  return <PropertyDetail id={id} eventId={eventId} />;
}

export default function PropertyPage() {
  return (
    <ClubShell>
      <Screen title="Stay" icon={Building2} back="/club/properties" width="wide">
        <Suspense fallback={<Spinner />}><Detail /></Suspense>
      </Screen>
    </ClubShell>
  );
}
