'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, CalendarDays, MapPin } from 'lucide-react';
import { Avatar, Badge, Card, Notice, Spinner } from '../ui';
import { clubFetch, rupees, shortDate } from '../api';
import { ReportButton } from '../ReportButton';
import { KIND_LABEL } from '../home/UpcomingPlans';
import { DISPLAY } from '@/components/vibers/vibers-fonts';
import { CreatorPanel } from './CreatorPanel';
import { JoinPanel } from './JoinPanel';
import { DealsPanel } from './DealsPanel';
import { MoneyPanel } from './MoneyPanel';

function Section({ title, text }: { title: string; text: string | null }) {
  if (!text) return null;
  return <div><p className="text-xs font-semibold uppercase tracking-wider text-[#2a1250]/45">{title}</p><p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{text}</p></div>;
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
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        {event.covers.length > 0 && (
          <div className="flex snap-x gap-2 overflow-x-auto rounded-3xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {event.covers.map((url: string, i: number) => <img key={i} src={url} alt={`${event.title} photo ${i + 1}`} className="aspect-[16/10] w-full shrink-0 snap-start rounded-3xl object-cover sm:w-[80%]" />)}
          </div>
        )}
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge>{KIND_LABEL[event.kind]}</Badge>
            {event.verified && <Badge tone="good"><BadgeCheck className="h-3 w-3" /> Vibers Verified Plan</Badge>}
            {event.status !== 'approved' && <Badge tone="warn">{event.status}</Badge>}
          </div>
          <h1 className={`${DISPLAY} mt-2 text-3xl leading-tight sm:text-4xl`}>{event.title}</h1>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#2a1250]/65">
            <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" />{shortDate(event.starts_at)} → {shortDate(event.ends_at)}</span>
            {event.venue && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{event.venue}</span>}
          </p>
          {creator && (
            <div className="mt-4 flex items-center gap-3">
              <Avatar url={creator.avatar_url} name={creator.name} size={36} />
              <p className="text-sm">Hosted by <span className="font-semibold">{creator.name}</span>{creator.viber_id && <span className="text-[#2a1250]/50"> {creator.viber_id}</span>}</p>
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
              <p className="text-xs font-semibold uppercase tracking-wider text-[#2a1250]/45">Budget breakdown</p>
              <ul className="mt-1 space-y-1 text-sm">{event.budget.map((b: any, i: number) => <li key={i} className="flex justify-between"><span>{b.label}</span><span>{rupees(b.amount)}</span></li>)}</ul>
            </div>
          )}
          <Section title="Payment schedule" text={event.payment_schedule.map((s: any) => `${s.label}: ${s.bps / 100}%`).join(' · ')} />
        </Card>
        {showDeals && <DealsPanel view={view} onChanged={load} />}
      </div>
      <aside className="space-y-4">
        {me.isCreator ? <CreatorPanel view={view} onChanged={load} /> : event.status === 'approved' ? <JoinPanel view={view} onChanged={load} /> : null}
        {showDeals && <MoneyPanel view={view} onChanged={load} />}
      </aside>
    </div>
  );
}
