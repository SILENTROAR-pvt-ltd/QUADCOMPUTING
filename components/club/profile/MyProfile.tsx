'use client';

import React, { useRef, useState } from 'react';
import { IdCard, Pencil } from 'lucide-react';
import { Button, Notice, Spinner } from '../ui';
import { SectionTitle, Sheet } from '../ui-extra';
import { uploadMedia } from '../api';
import { useClub } from '../club-context';
import { ViberVisa } from '../pass/ViberVisa';
import { ProfileEditor } from '../pass/ProfileEditor';
import { AccountLinks } from './AccountLinks';
import { AuthorPosts } from './AuthorPosts';
import { HostedPlans } from './HostedPlans';
import { NetworkSheet } from './NetworkSheet';
import { ProfileHero } from './ProfileHero';
import { BioCard } from './BioCard';
import { useMemberProfile } from './useMemberProfile';

/** Your travel profile: photo, followers and following, counts, your Club Visa, your plans and posts. */
export function MyProfile() {
  const { me, refresh } = useClub();
  const { data, error, reload } = useMemberProfile(me.user?.id);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [list, setList] = useState<'followers' | 'following' | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const photo = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    setPhotoError('');
    const res = await uploadMedia('avatars', f);
    setBusy(false);
    if (!res.ok) return setPhotoError(res.error);
    await Promise.all([refresh(), reload()]);
  };

  return (
    <div className="space-y-8">
      <div>
        <Notice>{error}</Notice>
        {data ? <ProfileHero data={data} onPhoto={() => file.current?.click()} photoBusy={busy} onOpenNetwork={setList} /> : !error && <Spinner />}
        <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { void photo(e.target.files?.[0]); e.target.value = ''; }} />
        <div className="mx-auto mt-6 max-w-lg space-y-3">
          <Notice>{photoError}</Notice>
          {data && <BioCard bio={data.details.bio} self onEdit={() => setEditing(true)} />}
          <div className="grid grid-cols-2 gap-2.5">
            <Button tone="ink" className="h-12 rounded-full" onClick={() => setEditing(true)}><Pencil aria-hidden="true" className="h-4 w-4" /> Edit profile</Button>
            <a href="#visa" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold ring-1 ring-[#14261b]/15 hover:bg-[#f2f0e8]"><IdCard aria-hidden="true" className="h-4 w-4" /> Club Visa</a>
          </div>
        </div>
      </div>
      {data && <HostedPlans plans={data.plans} self />}
      {me.user?.id && <AuthorPosts userId={me.user.id} self />}
      <section id="visa" aria-labelledby="visa-title" className="scroll-mt-24">
        <SectionTitle id="visa-title" title="Your Club Visa" sub="Your travel document for every Vibers property. Your Viber ID is the same @handle everywhere." />
        <ViberVisa profile={me.profile} viberId={me.viberId || me.profile?.viber_id} />
      </section>
      <AccountLinks />
      <Sheet open={editing} onClose={() => setEditing(false)} title="Edit profile">
        <ProfileEditor onSaved={() => { setEditing(false); void reload(); }} />
      </Sheet>
      {list && me.user?.id && <NetworkSheet memberId={me.user.id} list={list} open onClose={() => { setList(null); void reload(); }} />}
    </div>
  );
}
