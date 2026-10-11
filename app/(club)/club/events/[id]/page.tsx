'use client';

import { useParams } from 'next/navigation';
import { ClubShell } from '@/components/club/ClubShell';
import { EventDetail } from '@/components/club/events/EventDetail';

export default function PlanPage() {
  const { id } = useParams<{ id: string }>();
  return <ClubShell><EventDetail id={id} /></ClubShell>;
}
