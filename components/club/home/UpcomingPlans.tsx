'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, CalendarDays } from 'lucide-react';
import { Badge, Empty } from '../ui';
import { clubFetch, rupees, shortDate } from '../api';

export interface PlanCard { id: string; title: string; kind: string; starts_at: string; venue: string | null; status: string; verified: boolean; ticket_price: number; cover: string | null }

export const KIND_LABEL: Record<string, string> = { tour: 'Tour', event: 'Event', short_plan: 'Short plan' };

export function PlanTile({ e }: { e: PlanCard }) {
  return (
    <Link href={`/club/events/${e.id}`} className="group overflow-hidden rounded-3xl border border-[#2a1250]/10 bg-white/85 transition hover:shadow-lg">
      <div className="aspect-[16/9] bg-[radial-gradient(circle_at_20%_20%,#ff6a3d_0%,transparent_50%),radial-gradient(circle_at_80%_60%,#7c3aed_0%,transparent_55%)] bg-[#f3ebff]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {e.cover && <img src={e.cover} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge>{KIND_LABEL[e.kind] || e.kind}</Badge>
          {e.verified && <Badge tone="good"><BadgeCheck aria-hidden="true" className="h-3 w-3" /> Vibers Verified</Badge>}
          {e.status !== 'approved' && <Badge tone="warn">{e.status}</Badge>}
        </div>
        <p className="mt-2 font-semibold leading-snug group-hover:underline">{e.title}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-[#2a1250]/55"><CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />{shortDate(e.starts_at)}{e.venue ? ` · ${e.venue}` : ''}</p>
        <p className="mt-2 text-sm font-semibold">{e.ticket_price ? rupees(e.ticket_price) : 'Free'}</p>
      </div>
    </Link>
  );
}

/** The next three approved plans, for the club home. */
export function UpcomingPlans() {
  const [events, setEvents] = useState<PlanCard[] | null>(null);
  useEffect(() => { void clubFetch('/events').then((r) => r.ok && setEvents(r.data.events.slice(0, 3))); }, []);
  return (
    <section aria-labelledby="upcoming">
      <div className="flex items-baseline justify-between">
        <h2 id="upcoming" className="text-lg font-semibold">Upcoming plans</h2>
        <Link href="/club/events" className="text-sm font-semibold underline-offset-4 hover:underline">All plans</Link>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{events?.map((e) => <PlanTile key={e.id} e={e} />)}</div>
      {events && events.length === 0 && <Empty title="No plans yet">Be the first: <Link href="/club/events/new" className="font-semibold underline">host a plan</Link>.</Empty>}
    </section>
  );
}
