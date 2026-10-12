'use client';

import { useParams } from 'next/navigation';
import { Plane } from 'lucide-react';
import { ClubShell } from '@/components/club/ClubShell';
import { Screen } from '@/components/club/nav/Screen';
import { EventDetail } from '@/components/club/events/EventDetail';

export default function PlanPage() {
  const { id } = useParams<{ id: string }>();
  return <ClubShell><Screen title="Trip" icon={Plane} back="/club/events" width="wide"><EventDetail id={id} /></Screen></ClubShell>;
}
