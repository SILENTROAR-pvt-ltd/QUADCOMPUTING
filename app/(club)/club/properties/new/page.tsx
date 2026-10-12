'use client';

import { Building2 } from 'lucide-react';
import { ClubShell } from '@/components/club/ClubShell';
import { Screen } from '@/components/club/nav/Screen';
import { useClub } from '@/components/club/club-context';
import { Heading, Notice } from '@/components/club/ui';
import { PropertyForm } from '@/components/club/properties/PropertyForm';

function NewListing() {
  const { me } = useClub();
  if (me.profile?.account_type !== 'business') return <Notice tone="info">Only business members can list properties.</Notice>;
  return <PropertyForm />;
}

export default function NewPropertyPage() {
  return (
    <ClubShell>
      <Screen title="List a property" icon={Building2} back="/club/properties">
        <div className="mx-auto max-w-3xl">
          <Heading kicker="List a property" title="Open your doors to the club">Staff verify every listing before it appears in search.</Heading>
          <NewListing />
        </div>
      </Screen>
    </ClubShell>
  );
}
