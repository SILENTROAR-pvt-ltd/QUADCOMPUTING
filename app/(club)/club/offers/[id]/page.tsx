'use client';

import { useParams } from 'next/navigation';
import { Handshake } from 'lucide-react';
import { ClubShell } from '@/components/club/ClubShell';
import { Screen } from '@/components/club/nav/Screen';
import { OfferThread } from '@/components/club/offers/OfferThread';

export default function OfferPage() {
  const { id } = useParams<{ id: string }>();
  return <ClubShell><Screen title="Group deal" icon={Handshake} back="/club/events"><OfferThread id={id} /></Screen></ClubShell>;
}
