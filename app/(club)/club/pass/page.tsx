'use client';

import { ClubShell } from '@/components/club/ClubShell';
import { useClub } from '@/components/club/club-context';
import { Heading } from '@/components/club/ui';
import { ViberPass } from '@/components/club/pass/ViberPass';
import { ProfileEditor } from '@/components/club/pass/ProfileEditor';

function Pass() {
  const { me } = useClub();
  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div>
        <Heading kicker="Your Viber Pass" title="Verified. Welcome in.">
          Your Viber ID is the same @handle you use at every Vibers property, so your stays and your club life are one identity.
        </Heading>
        <ViberPass profile={me.profile} viberId={me.viberId || me.profile?.viber_id} />
      </div>
      <ProfileEditor />
    </div>
  );
}

export default function PassPage() {
  return <ClubShell><Pass /></ClubShell>;
}
