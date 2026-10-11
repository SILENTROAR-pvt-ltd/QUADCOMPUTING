'use client';

import { useParams } from 'next/navigation';
import { ClubShell } from '@/components/club/ClubShell';
import { OfferThread } from '@/components/club/offers/OfferThread';

export default function OfferPage() {
  const { id } = useParams<{ id: string }>();
  return <ClubShell><OfferThread id={id} /></ClubShell>;
}
