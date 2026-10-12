'use client';

import { CalendarPlus } from 'lucide-react';
import { ClubShell } from '@/components/club/ClubShell';
import { Screen } from '@/components/club/nav/Screen';
import { Heading } from '@/components/club/ui';
import { EventForm } from '@/components/club/events/EventForm';

export default function NewPlanPage() {
  return (
    <ClubShell>
      <Screen title="Host a plan" icon={CalendarPlus} back="/club/events">
        <div className="mx-auto max-w-3xl">
          <Heading kicker="Host a plan" title="What are we doing?">Save a draft, then sign the responsibility agreement to send it for review.</Heading>
          <EventForm />
        </div>
      </Screen>
    </ClubShell>
  );
}
