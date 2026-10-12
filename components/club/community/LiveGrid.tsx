'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Empty, Notice, Spinner, field } from '../ui';
import { Chip, SectionTitle } from '../ui-extra';
import { clubFetch, GENERATION_LABEL } from '../api';
import { useClub } from '../club-context';
import { MemberCard, type LiveMember } from './MemberCard';

/** Who is in the club right now. Refreshes every 20 s; filters by generation, city and Viber ID. */
export function LiveGrid() {
  const { me } = useClub();
  const router = useRouter();
  const [members, setMembers] = useState<LiveMember[] | null>(null);
  const [generation, setGeneration] = useState('');
  const [city, setCity] = useState('');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await clubFetch(`/presence?${new URLSearchParams({ generation, city, q })}`);
    if (res.ok) { setMembers(res.data.members); setError(''); } else setError(res.error);
  }, [generation, city, q]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    const every = setInterval(load, 20_000);
    return () => { clearTimeout(t); clearInterval(every); };
  }, [load]);

  const message = async (userId: string) => {
    const res = await clubFetch('/rooms/dm', { body: { user_id: userId } });
    if (res.ok) router.push(`/club/chat/${res.data.roomId}`); else setError(res.error);
  };

  return (
    <section aria-labelledby="live-now">
      <SectionTitle id="live-now" title={<span className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c8da4a] opacity-60 motion-reduce:hidden" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#c8da4a]" /></span>
        Live now {members && <span className="text-sm font-normal text-[#14261b]/60">· {members.length}</span>}
      </span>} sub="Members with the club open right now. Close the tab and you are off the grid." />
      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <span className="relative">
          <Search aria-hidden="true" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#14261b]/60" />
          <input aria-label="Search by Viber ID or name" className={`${field} pl-10`} placeholder="@viber or name" value={q} onChange={(e) => setQ(e.target.value)} />
        </span>
        <input aria-label="City" className={field} placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
      </div>
      <div role="group" aria-label="Generation" className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Chip active={!generation} onClick={() => setGeneration('')}>Everyone</Chip>
        {Object.entries(GENERATION_LABEL).map(([k, v]) => <Chip key={k} active={generation === k} onClick={() => setGeneration(k)}>{v}</Chip>)}
      </div>
      <Notice>{error}</Notice>
      {!members && !error && <Spinner />}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {members?.map((m) => <MemberCard key={m.user_id} m={m} isMe={m.user_id === me.user?.id} onMessage={message} />)}
      </div>
      {members && members.length === 0 && <Empty title="Quiet right now">Nobody matches these filters. Members appear here while their club tab is open.</Empty>}
    </section>
  );
}
