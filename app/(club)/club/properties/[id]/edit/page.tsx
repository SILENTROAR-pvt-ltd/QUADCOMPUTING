'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { ClubShell } from '@/components/club/ClubShell';
import { Screen } from '@/components/club/nav/Screen';
import { Heading, Notice, Spinner } from '@/components/club/ui';
import { clubFetch } from '@/components/club/api';
import { PropertyForm } from '@/components/club/properties/PropertyForm';
import { fromProperty, type PropertyForm as Form } from '@/components/club/properties/property-form';

function Edit({ id }: { id: string }) {
  const [initial, setInitial] = useState<Form | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    void clubFetch(`/properties/${id}`).then((r) => {
      if (!r.ok) return setError(r.error);
      if (!r.data.mine) return setError('Only the owner can edit this listing.');
      setInitial(fromProperty(r.data.property));
    });
  }, [id]);
  if (error) return <Notice>{error}</Notice>;
  return initial ? <PropertyForm initial={initial} propertyId={id} /> : <Spinner />;
}

export default function EditPropertyPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <ClubShell>
      <Screen title="Edit listing" icon={Pencil} back={`/club/properties/${id}`}>
        <div className="mx-auto max-w-3xl">
          <Heading kicker="Edit listing" title="Update your property">Saving sends the listing back to staff for a quick re-check.</Heading>
          <Edit id={id} />
        </div>
      </Screen>
    </ClubShell>
  );
}
