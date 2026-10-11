'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClubShell } from '@/components/club/ClubShell';
import { Empty, Heading, Spinner } from '@/components/club/ui';
import { clubFetch } from '@/components/club/api';
import { PlanTile, type PlanCard } from '@/components/club/home/UpcomingPlans';

function Plans() {
  const [tab, setTab] = useState<'upcoming' | 'mine'>('upcoming');
  const [events, setEvents] = useState<PlanCard[] | null>(null);
  useEffect(() => {
    setEvents(null);
    void clubFetch(`/events${tab === 'mine' ? '?mine=1' : ''}`).then((r) => setEvents(r.ok ? r.data.events : []));
  }, [tab]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Heading kicker="Plans" title="Trips, nights out and tours">Hosted by members. Approved by the club. Paid through escrow.</Heading>
        <Link href="/club/events/new" className="mb-6 inline-flex h-10 items-center rounded-full bg-[#7c3aed] px-5 text-sm font-semibold text-white">Host a plan</Link>
      </div>
      <div role="tablist" className="mb-5 inline-flex gap-1 rounded-full bg-[#2a1250]/[0.05] p-1">
        {(['upcoming', 'mine'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} type="button" onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${tab === t ? 'bg-white shadow-sm' : 'text-[#2a1250]/55'}`}>{t === 'upcoming' ? 'Upcoming' : 'My plans'}</button>
        ))}
      </div>
      {!events ? <Spinner /> : events.length === 0
        ? <Empty title={tab === 'mine' ? 'You have not hosted a plan yet' : 'Nothing planned yet'}>Any approved member can host. <Link href="/club/events/new" className="font-semibold underline">Start one</Link>.</Empty>
        : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{events.map((e) => <PlanTile key={e.id} e={e} />)}</div>}
    </>
  );
}

export default function PlansPage() {
  return <ClubShell><Plans /></ClubShell>;
}
