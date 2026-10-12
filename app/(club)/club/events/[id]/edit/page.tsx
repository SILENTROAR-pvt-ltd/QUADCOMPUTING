'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { ClubShell } from '@/components/club/ClubShell';
import { Screen } from '@/components/club/nav/Screen';
import { Heading, Notice, Spinner } from '@/components/club/ui';
import { clubFetch } from '@/components/club/api';
import { EventForm } from '@/components/club/events/EventForm';
import { fromEvent, type EventForm as Form } from '@/components/club/events/event-form';

function Edit({ id }: { id: string }) {
  const [initial, setInitial] = useState<Form | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    void clubFetch(`/events/${id}`).then((r) => {
      if (!r.ok) return setError(r.error);
      if (!r.data.me.isCreator) return setError('Only the creator can edit this plan.');
      setInitial(fromEvent(r.data.event, r.data.event.covers));
    });
  }, [id]);
  if (error) return <Notice>{error}</Notice>;
  if (!initial) return <Spinner />;
  return <EventForm initial={initial} eventId={id} />;
}

export default function EditPlanPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <ClubShell>
      <Screen title="Edit plan" icon={Pencil} back={`/club/events/${id}`}>
        <div className="mx-auto max-w-3xl">
          <Heading kicker="Edit plan" title="Make it right">Saving returns the plan to draft; submit it again from the plan page.</Heading>
          <Edit id={id} />
        </div>
      </Screen>
    </ClubShell>
  );
}
