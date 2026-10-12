'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { History, Plane } from 'lucide-react';
import { ClubShell } from '@/components/club/ClubShell';
import { Screen } from '@/components/club/nav/Screen';
import { Empty, Notice, Spinner } from '@/components/club/ui';
import { Segmented, SectionTitle } from '@/components/club/ui-extra';
import { clubFetch } from '@/components/club/api';
import { CreateMenu } from '@/components/club/explore/CreateMenu';
import { ExploreCard } from '@/components/club/explore/ExploreCard';
import type { ExploreItem } from '@/lib/club/explore/explore-filter';

type Tab = 'upcoming' | 'going' | 'hosting' | 'history';
interface Activity { hosting: ExploreItem[]; going: ExploreItem[]; history: ExploreItem[] }

const NAME: Record<Tab, string> = { upcoming: 'Upcoming', going: 'Going', hosting: 'Hosting', history: 'History' };
const COPY: Record<Tab, { title: string; sub: string; empty: string; hint: React.ReactNode }> = {
  upcoming: { title: 'Upcoming', sub: 'Trips and events the club has approved', empty: 'Nothing planned yet', hint: <>Browse meetups and everything else in <Link href="/club/explore" className="font-semibold text-[#3c6b2b] underline">Explore</Link>.</> },
  going: { title: "You're in", sub: 'Trips, events and meetups you have joined', empty: 'You have not joined anything yet', hint: <>Find something in <Link href="/club/explore" className="font-semibold text-[#3c6b2b] underline">Explore</Link> and tap I&apos;m in.</> },
  hosting: { title: 'Hosting', sub: 'Everything you run: trips, events and meetups, in any state', empty: 'You are not hosting anything right now', hint: 'Use Create to start a meetup in seconds, or plan a trip.' },
  history: { title: 'History', sub: 'What you hosted or joined that has finished or was cancelled', empty: 'No history yet', hint: 'Finished and cancelled trips, events and meetups show up here.' },
};

function Trips() {
  const [tab, setTab] = useState<Tab>('hosting');
  const [activity, setActivity] = useState<Activity | null>(null);
  const [upcoming, setUpcoming] = useState<ExploreItem[] | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    const [mine, feed] = await Promise.all([clubFetch<Activity>('/activity'), clubFetch<{ items: ExploreItem[] }>('/explore')]);
    if (mine.ok) setActivity(mine.data); else { setError(mine.error); setActivity({ hosting: [], going: [], history: [] }); }
    setUpcoming(feed.ok ? feed.data.items.filter((i) => i.source === 'plan') : []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const toggle = useCallback(async (item: ExploreItem) => {
    setBusyId(item.id);
    setError('');
    const res = await clubFetch(`/meetups/${item.id}`, { body: { action: item.me.going ? 'leave' : 'join' } });
    setBusyId('');
    if (!res.ok) return setError(res.error);
    await load();
  }, [load]);

  const lists: Record<Tab, ExploreItem[] | null> = { upcoming, going: activity?.going ?? null, hosting: activity?.hosting ?? null, history: activity?.history ?? null };
  const options = (Object.keys(NAME) as Tab[]).map((k): [Tab, string] => [k, k !== 'upcoming' && lists[k]?.length ? `${NAME[k]} · ${lists[k]!.length}` : NAME[k]]);
  const items = lists[tab];
  const copy = COPY[tab];

  return (
    <>
      <div className="overflow-x-auto"><Segmented label="Trips" value={tab} options={options} onChange={setTab} /></div>
      <div className="mt-6">
        <SectionTitle title={copy.title} sub={<span className="inline-flex items-center gap-1.5">{copy.sub}{tab === 'history' && <History aria-hidden="true" className="h-4 w-4 text-[#3c6b2b]" />}</span>} />
        <Notice>{error}</Notice>
        {!items ? <Spinner /> : items.length === 0 && !error
          ? <Empty title={copy.empty}>{copy.hint}</Empty>
          : <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((i) => <ExploreCard key={`${i.source}-${i.id}`} item={i} busy={busyId === i.id} onToggle={toggle} />)}</div>}
      </div>
      <CreateMenu variant="fab" />
    </>
  );
}

export default function TripsPage() {
  return <ClubShell><Screen title="Trips" icon={Plane} width="page"><Trips /></Screen></ClubShell>;
}
