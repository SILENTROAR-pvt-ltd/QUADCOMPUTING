'use client';

import React, { useState } from 'react';
import { LineChart } from '../charts/LineChart';
import { Panel, ErrorNote } from '../ui/Panel';
import { compactInr, dayLabel, inr } from '../ui/format';
import { useAdminData } from '../ui/useAdminData';
import { useAdminSession } from '../shell/useAdminSession';
import { WelcomeHeader } from './WelcomeHeader';
import { KpiCards } from './KpiCards';
import { LiveStrip } from './LiveStrip';
import { TopVenues, NewestVenues } from './SideLists';
import { LatestPayments } from './LatestPayments';
import { PlanMixCard, AttentionCard } from './PlanAndQueues';
import type { OverviewAnswer } from './types';

const SERIES = [{ name: 'F&B', color: '#2a78d6' }, { name: 'Stays', color: '#eb6834' }];

/** /admin: the command center, live (re-read every 30 seconds while open). */
export function DashboardPage() {
  const [days, setDays] = useState(7);
  const session = useAdminSession();
  const { data, error, loading, updatedAt, refresh } = useAdminData<OverviewAnswer>(`/api/admin/overview?days=${days}`, 30_000);

  return (
    <div>
      <WelcomeHeader name={session.name} days={days} onDays={setDays} updatedAt={updatedAt} loading={loading} onRefresh={() => void refresh()} />
      {error && <div className="mb-4"><ErrorNote>{error}</ErrorNote></div>}
      {!data ? <Skeleton /> : (
        <div className="space-y-5">
          <div>
            <KpiCards cur={data.current} prev={data.previous} />
            <LiveStrip floor={data.floor} health={data.health} />
          </div>
          <div className="grid gap-5 xl:grid-cols-3">
            <Panel title="Summary" note={`Settled GMV per day · ${data.current.orders} bills · ${data.venuesTotal} venues on the platform`} className="xl:col-span-2">
              <LineChart format={(n) => inr(n)} axis={compactInr} series={SERIES}
                points={data.series.map((p) => ({ key: p.day, label: dayLabel(p.day), values: [p.fnb, p.stay], note: `${p.orders} bills · ${inr(p.gmv)} total` }))} />
            </Panel>
            <TopVenues venues={data.topVenues} days={data.days} />
          </div>
          <div className="grid gap-5 xl:grid-cols-3">
            <div className="xl:col-span-2"><LatestPayments payments={data.latestPayments} /></div>
            <NewestVenues venues={data.newestVenues} />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <PlanMixCard plans={data.plans} />
            <AttentionCard queues={data.queues} />
          </div>
          {data.source === 'scan' && <p className="text-[11px] text-neutral-500">Figures are computed from raw bills. Apply supabase/apply-pending-2026-10-24c.sql for the faster database rollups.</p>}
        </div>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading the dashboard">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-white" />)}</div>
      <div className="grid gap-5 xl:grid-cols-3"><div className="h-80 animate-pulse rounded-2xl bg-white xl:col-span-2" /><div className="h-80 animate-pulse rounded-2xl bg-white" /></div>
    </div>
  );
}
