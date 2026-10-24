import React from 'react';
import { StatusPill } from '../ui/StatusPill';
import { count } from '../ui/format';
import type { OverviewAnswer } from './types';

/** Right now: tables seated, guests signed in, staff on duty, rooms occupied, and each service's response time. */
export function LiveStrip({ floor, health }: { floor: OverviewAnswer['floor']; health: OverviewAnswer['health'] }) {
  const items = [
    { label: 'Tables open', value: floor.openTables },
    { label: 'Guests online', value: floor.guestsOnline, title: 'Signed-in guests seen in the last 15 minutes' },
    { label: 'Staff on duty', value: floor.staffToday, title: 'Staff signed in during the last 12 hours' },
    { label: 'Rooms occupied', value: floor.roomsOccupied },
  ];
  return (
    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#ebebe8] bg-white px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
        <span className="flex items-center gap-2 font-semibold text-neutral-950">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>
          Live now
        </span>
        {items.map((i) => <span key={i.label} title={i.title} className="text-neutral-500"><b className="tabular-nums text-neutral-950">{count(i.value)}</b> {i.label.toLowerCase()}</span>)}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {health.checks.map((c) => (
          <span key={c.id} title={c.detail} className="inline-flex items-center gap-1.5 text-[12px] text-neutral-600">
            {c.label.replace('Supabase ', '').replace('Upstash ', '')}
            <StatusPill level={c.level} label={c.ms === null ? undefined : `${c.ms} ms`} />
          </span>
        ))}
      </div>
    </div>
  );
}
