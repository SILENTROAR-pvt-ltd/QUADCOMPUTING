'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Avatar, Card, Notice, Spinner } from '../ui';
import { clubFetch, rupees } from '../api';
import { ReportButton } from '../ReportButton';
import { PlanHero } from './PlanHero';
import { CreatorPanel } from './CreatorPanel';
import { JoinPanel } from './JoinPanel';
import { DealsPanel } from './DealsPanel';
import { MoneyPanel } from './MoneyPanel';

function Section({ title, text }: { title: string; text: string | null }) {
  if (!text) return null;
  return <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#3c6b2b]">{title}</p><p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-[#14261b]/85">{text}</p></div>;
}

/** The plan page: details for everyone, actions by role, deals and the escrow ledger for its creator. */
export function EventDetail({ id }: { id: string }) {
  const [view, setView] = useState<any>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    const res = await clubFetch(`/events/${id}`);
    if (res.ok) setView(res.data); else setError(res.error);
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  if (error) return <Notice>{error}</Notice>;
  if (!view) return <Spinner />;
  const { event, creator, me } = view;
  const showDeals = me.isCreator || me.staff;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <PlanHero event={event} />
        <div>
          {creator && (
            <div className="flex items-center gap-3 rounded-full bg-[#e1efe3] py-2.5 pl-2.5 pr-4">
              <Link href={`/club/members/${creator.user_id}`} className="rounded-full"><Avatar url={creator.avatar_url} name={creator.name} size={40} /></Link>
              <p className="min-w-0 flex-1 text-sm"><span className="text-[#14261b]/65">Hosted by</span><br /><Link href={`/club/members/${creator.user_id}`} className="font-semibold hover:underline">{creator.name}</Link>{creator.handle && <span className="text-[#14261b]/60"> @{creator.handle}</span>}</p>
              {!me.isCreator && <ReportButton type="event" id={event.id} compact label="Report this plan" />}
            </div>
          )}
        </div>
        <Card className="grid gap-5 sm:grid-cols-2">
          <Section title="Transport" text={event.transport} /><Section title="Food" text={event.food} /><Section title="Activities" text={event.activities} />
          <Section title="Stay budget" text={`${rupees(event.price_min)} – ${rupees(event.price_max)} per night`} />
          <Section title="Cancellation policy" text={event.cancellation_policy} /><Section title="Safety protocol" text={event.safety_protocol} />
          {event.budget.length > 0 && (
            <div className="sm:col-span-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#3c6b2b]">Budget breakdown</p>
              <ul className="mt-1.5 divide-y divide-[#14261b]/[0.06] text-sm">{event.budget.map((b: any, i: number) => <li key={i} className="flex justify-between py-1.5"><span className="text-[#14261b]/80">{b.label}</span><span>{rupees(b.amount)}</span></li>)}</ul>
            </div>
          )}
          <Section title="Payment schedule" text={event.payment_schedule.map((s: any) => `${s.label}: ${s.bps / 100}%`).join(' · ')} />
        </Card>
        {showDeals && <DealsPanel view={view} onChanged={load} />}
      </div>
      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        {me.isCreator ? <CreatorPanel view={view} onChanged={load} /> : event.status === 'approved' ? <JoinPanel view={view} onChanged={load} /> : null}
        {showDeals && <MoneyPanel view={view} onChanged={load} />}
      </aside>
    </div>
  );
}
