'use client';

import React, { useState } from 'react';
import { DonutChart } from '@/components/host/workspaces/dashboard/reports/DonutChart';
import { StackedBars } from '../charts/StackedBars';
import { Heatmap } from '../charts/Heatmap';
import { RankBars } from '../charts/RankBars';
import { Panel, Stat, ErrorNote } from '../ui/Panel';
import { compactInr, dayLabel, inr, pctChange } from '../ui/format';
import { useAdminData } from '../ui/useAdminData';
import { ExportsCard } from './ExportsCard';

interface AnalyticsAnswer {
  days: number; source: string; truncated: boolean; averageBill: number;
  totals: { gmv: number; orders: number; tax: number; stay: number; fnb: number; venues: number };
  previous: { gmv: number; orders: number };
  change: { gmv: number | null; orders: number | null };
  series: Array<{ day: string; gmv: number; orders: number; stay: number; fnb: number }>;
  leaderboard: Array<{ venue_id: string; name: string; city: string | null; gmv: number; orders: number; avgBill: number; stay: number }>;
  heatmap: number[][];
}

const RANGES = [7, 30, 90];

/** /admin/analytics: growth over 7, 30 or 90 days against the period before, who drives it, when, and the exports. */
export function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const { data, error } = useAdminData<AnalyticsAnswer>(`/api/admin/analytics?days=${days}`, 60_000);
  const good = (v: number | null) => (v === null ? null : v >= 0);

  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-xl border border-[#e3e3df] bg-white p-1 w-fit">
        {RANGES.map((d) => (
          <button key={d} type="button" onClick={() => setDays(d)} className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold cursor-pointer ${days === d ? 'bg-[#0b0b0b] text-white' : 'text-neutral-600 hover:text-neutral-950'}`}>Last {d} days</button>
        ))}
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      {!data ? <div className="h-64 animate-pulse rounded-2xl bg-white" /> : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="GMV" value={inr(data.totals.gmv)} change={{ text: `${pctChange(data.change.gmv)} vs previous`, good: good(data.change.gmv) }} />
            <Stat label="Bills settled" value={data.totals.orders.toLocaleString('en-IN')} change={{ text: `${pctChange(data.change.orders)} vs previous`, good: good(data.change.orders) }} />
            <Stat label="Average bill" value={inr(data.averageBill, 2)} hint={`${data.totals.venues} venues billed`} />
            <Stat label="GST collected" value={inr(data.totals.tax)} hint="On settled bills" />
          </div>
          <Panel title="GMV per day" note="Settled bills, India business days">
            <StackedBars format={(n) => inr(n)} axis={compactInr} series={[{ name: 'F&B', color: '#2a78d6' }, { name: 'Stays', color: '#eb6834' }]}
              points={data.series.map((p) => ({ key: p.day, label: dayLabel(p.day), values: [p.fnb, p.stay], note: `${p.orders} bills` }))} />
          </Panel>
          <div className="grid gap-5 xl:grid-cols-3">
            <Panel title="Venue leaderboard" note="Ranked by GMV" className="xl:col-span-2">
              <RankBars rows={data.leaderboard.slice(0, 10).map((v) => ({ id: v.venue_id, label: v.name, sub: `${v.city || 'City not set'} · avg bill ${inr(v.avgBill)}`, value: v.gmv, display: inr(v.gmv), extra: `${v.orders} bills` }))} />
            </Panel>
            <Panel title="F&B vs stays" note="Share of GMV">
              <DonutChart format={(n) => inr(n)} centerLabel="GMV" slices={[
                { id: 'fnb', label: 'F&B (dine-in, room service, delivery)', value: data.totals.fnb, color: '#2a78d6' },
                { id: 'stay', label: 'Stays (room bills, advances)', value: data.totals.stay, color: '#eb6834' },
              ]} />
            </Panel>
          </div>
          <Panel title="Peak hours" note="Settled bills by weekday and hour, IST"><Heatmap grid={data.heatmap} /></Panel>
          {data.truncated && <p className="text-[11px] text-amber-700">Showing the first 100,000 bills. Apply supabase/apply-pending-2026-10-24c.sql for database rollups with no limit.</p>}
        </>
      )}
      <ExportsCard />
    </div>
  );
}
