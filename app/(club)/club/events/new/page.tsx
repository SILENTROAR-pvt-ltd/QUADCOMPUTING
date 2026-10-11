'use client';

import { ClubShell } from '@/components/club/ClubShell';
import { Heading } from '@/components/club/ui';
import { EventForm } from '@/components/club/events/EventForm';

export default function NewPlanPage() {
  return (
    <ClubShell>
      <div className="mx-auto max-w-3xl">
        <Heading kicker="Host a plan" title="What are we doing?">Save a draft, then sign the responsibility agreement to send it for review.</Heading>
        <EventForm />
      </div>
    </ClubShell>
  );
}
