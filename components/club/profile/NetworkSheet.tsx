'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Avatar, Notice, Spinner } from '../ui';
import { Sheet } from '../ui-extra';
import { clubFetch } from '../api';
import { FollowButton } from './FollowButton';
import type { NetworkMember } from './types';

/** A member's followers or following, with a follow button on each row (like Instagram's lists). */
export function NetworkSheet({ memberId, list: first, open, onClose }: {
  memberId: string; list: 'followers' | 'following'; open: boolean; onClose: () => void;
}) {
  const [list, setList] = useState<'followers' | 'following'>(first);
  const [members, setMembers] = useState<NetworkMember[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setMembers(null);
    setError('');
    void clubFetch<{ members: NetworkMember[] }>(`/members/${memberId}/network?list=${list}`).then((r) => {
      if (r.ok) setMembers(r.data.members); else setError(r.error);
    });
  }, [open, memberId, list]);

  return (
    <Sheet open={open} onClose={onClose} title="Network" focusField={false}>
      <div role="tablist" aria-label="Followers or following" className="mb-3 grid grid-cols-2 rounded-full bg-[#f2f0e8] p-1">
        {(['followers', 'following'] as const).map((tab) => (
          <button key={tab} type="button" role="tab" aria-selected={list === tab} onClick={() => setList(tab)}
            className={`rounded-full py-2 text-sm font-semibold capitalize transition ${list === tab ? 'bg-[#17301f] text-[#f6f4ec]' : 'text-[#14261b]/65 hover:text-[#14261b]'}`}>{tab}</button>
        ))}
      </div>
      <Notice>{error}</Notice>
      {!members && !error && <Spinner />}
      {members?.length === 0 && <p className="py-8 text-center text-sm text-[#14261b]/60">{list === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}</p>}
      <ul className="divide-y divide-[#14261b]/[0.06]">
        {members?.map((m) => (
          <li key={m.user_id} className="flex items-center gap-3 py-3">
            <Link href={`/club/members/${m.user_id}`} onClick={onClose} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl">
              <Avatar url={m.avatar_url} name={m.name} size={44} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{m.name}{m.is_viewer && <span className="font-normal text-[#14261b]/55"> · you</span>}</span>
                <span className="block truncate text-xs text-[#14261b]/60">{m.city}</span>
              </span>
            </Link>
            {!m.is_viewer && <FollowButton memberId={m.user_id} following={m.follows} size="sm" />}
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
