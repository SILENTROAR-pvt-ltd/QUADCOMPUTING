'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { ClubShell } from '@/components/club/ClubShell';
import { Spinner } from '@/components/club/ui';
import { PropertyDetail } from '@/components/club/properties/PropertyDetail';

function Detail() {
  const { id } = useParams<{ id: string }>();
  const eventId = useSearchParams()?.get('event') || null;
  return <PropertyDetail id={id} eventId={eventId} />;
}

export default function PropertyPage() {
  return <ClubShell><Suspense fallback={<Spinner />}><Detail /></Suspense></ClubShell>;
}
