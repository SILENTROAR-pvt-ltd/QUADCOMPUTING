'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquare, Pencil } from 'lucide-react';
import { Button, Notice, Spinner } from '../ui';
import { clubFetch } from '../api';
import { ReportButton } from '../ReportButton';
import { AuthorPosts } from './AuthorPosts';
import { FollowButton } from './FollowButton';
import { HostedPlans } from './HostedPlans';
import { NetworkSheet } from './NetworkSheet';
import { ProfileHero } from './ProfileHero';
import { BioCard } from './BioCard';
import { useMemberProfile } from './useMemberProfile';

/** Another member's travel profile: who they are, followers and following, what they host and post, and "Follow" / "Message". */
export function MemberProfile({ id }: { id: string }) {
  const router = useRouter();
  const { data, error, reload } = useMemberProfile(id);
  const [busy, setBusy] = useState(false);
  const [msgError, setMsgError] = useState('');
  const [list, setList] = useState<'followers' | 'following' | null>(null);

  const message = async () => {
    setBusy(true);
    const res = await clubFetch('/rooms/dm', { body: { user_id: id } });
    setBusy(false);
    if (res.ok) router.push(`/club/chat/${res.data.roomId}`); else setMsgError(res.error);
  };

  if (error) return <Notice>{error}</Notice>;
  if (!data) return <Spinner />;
  return (
    <div className="space-y-8">
      <div>
        <ProfileHero data={data} onOpenNetwork={setList} />
        <div className="mx-auto mt-6 max-w-lg space-y-3">
          <BioCard bio={data.details.bio} self={data.self} editHref="/club/pass" />
          {data.self ? (
            <Link href="/club/pass" className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#17301f] text-sm font-semibold text-[#f6f4ec] hover:bg-[#22432c]"><Pencil aria-hidden="true" className="h-4 w-4" /> Edit my profile</Link>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <FollowButton memberId={id} following={data.follows} onChange={() => void reload()} />
                <Button tone="quiet" busy={busy} onClick={message} className="h-12 rounded-full"><MessageSquare aria-hidden="true" className="h-4 w-4" /> Message</Button>
              </div>
              <div className="flex justify-center"><ReportButton type="user" id={id} label={`Report ${data.member.name}`} /></div>
              <Notice>{msgError}</Notice>
            </>
          )}
        </div>
      </div>
      <HostedPlans plans={data.plans} self={data.self} />
      <AuthorPosts userId={id} self={data.self} />
      {list && <NetworkSheet memberId={id} list={list} open onClose={() => { setList(null); void reload(); }} />}
    </div>
  );
}
