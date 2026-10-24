import React from 'react';
import Link from 'next/link';
import { Panel, Empty } from '../ui/Panel';
import { ago, inr } from '../ui/format';
import type { OverviewAnswer } from './types';

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || 'V';
const TILE = ['bg-[#fdf1e7] text-[#9a4d1c]', 'bg-[#eaf6ef] text-[#1f6b45]', 'bg-[#ecf2fd] text-[#1d4f9a]', 'bg-[#fcedef] text-[#9b2c3f]', 'bg-[#eef5e7] text-[#46621f]'];

function Tile({ name, i }: { name: string; i: number }) {
  return <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[13px] font-semibold ${TILE[i % TILE.length]}`}>{initials(name)}</span>;
}

/** The venues that settled the most in the period ("most selling"), with their GMV and bills. */
export function TopVenues({ venues, days }: { venues: OverviewAnswer['topVenues']; days: number }) {
  return (
    <Panel title="Top venues" note={`By GMV, last ${days} days`} actions={<Link href="/admin/analytics" className="text-xs font-semibold text-[#2a78d6] hover:underline">Leaderboard</Link>}>
      {venues.length === 0 ? <Empty>No settled bills in this period.</Empty> : (
        <ul className="space-y-3.5">
          {venues.map((v, i) => (
            <li key={v.venue_id} className="flex items-center gap-3">
              <Tile name={v.name} i={i} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium text-neutral-900">{v.name}</span>
                <span className="block text-[11px] text-neutral-500">{v.city || 'City not set'} · {v.orders} bills</span>
              </span>
              <span className="shrink-0 rounded-lg border border-[#ebebe8] px-2 py-1 text-[12px] font-semibold tabular-nums text-neutral-900">{inr(v.gmv)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** The newest venues on the platform, their plan, and a way into their record. */
export function NewestVenues({ venues }: { venues: OverviewAnswer['newestVenues'] }) {
  return (
    <Panel title="Newest venues" note="Latest sign-ups" actions={<Link href="/admin/venues" className="text-xs font-semibold text-[#2a78d6] hover:underline">All venues</Link>}>
      {venues.length === 0 ? <Empty>No venues yet.</Empty> : (
        <ul className="space-y-3.5">
          {venues.map((v, i) => (
            <li key={v.id} className="flex items-center gap-3">
              <Tile name={v.name} i={i + 2} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium text-neutral-900">{v.name}</span>
                <span className="block truncate text-[11px] text-neutral-500">{v.plan} · joined {ago(v.createdAt)}</span>
              </span>
              <Link href={`/admin/venues?venue=${v.id}`} className="shrink-0 rounded-lg border border-[#ebebe8] px-3 py-1 text-[12px] font-semibold text-[#2a78d6] hover:bg-[#ecf2fd]">View</Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
