'use client';

import React from 'react';
import { CheckCircle2, Clock, TrendingUp, Users } from 'lucide-react';
import type { StayHistoryMetrics } from '@/types';
import { inr } from './stay-format';

function Tile({ icon: Icon, label, value, hint, tone = 'text-neutral-700 bg-neutral-100' }: { icon: typeof Clock; label: string; value: string; hint: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <p className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500">
        <span className="truncate">{label}</span>
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${tone}`}><Icon className="h-3.5 w-3.5" aria-hidden /></span>
      </p>
      <p className="mt-1.5 truncate font-serif text-2xl tabular-nums text-neutral-950">{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-neutral-500">{hint}</p>
    </div>
  );
}

/** The stay history at a glance: stays completed, what they brought in, how long guests stay, how many came. */
export function StayHistoryMetricsRibbon({ metrics: m }: { metrics: StayHistoryMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile icon={CheckCircle2} label="Checkouts" value={String(m.totalCheckouts)} hint={`${m.checkoutsThisMonth} this month`} tone="bg-emerald-50 text-emerald-700" />
      <Tile icon={TrendingUp} label="Revenue" value={inr(m.totalRevenue)} hint={`${inr(m.revenueThisMonth)} this month`} tone="bg-emerald-50 text-emerald-700" />
      <Tile icon={Clock} label="Average stay" value={`${m.avgLengthOfStay || 1} night${(m.avgLengthOfStay || 1) === 1 ? '' : 's'}`} hint="Per completed stay" />
      <Tile icon={Users} label="Guests hosted" value={String(m.totalGuestsHosted || m.totalCheckouts)} hint="Across all stays" />
    </div>
  );
}
