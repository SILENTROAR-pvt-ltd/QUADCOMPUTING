'use client';

import React from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { DashboardCustomRangePicker } from './DashboardCustomRangePicker';

import type { Timeframe } from './useDashboardWorkspace';

interface DashboardHeaderProps {
  timeframe: Timeframe;
  setTimeframe: (t: Timeframe) => void;
  startDate: string;
  setStartDate: (d: string) => void;
  endDate: string;
  setEndDate: (d: string) => void;
  onApplyCustomRange: () => void;
  rangeLabel: string;
  isRefreshing: boolean;
  onOpenZReport: () => void;
}

const TABS: Array<{ id: Timeframe; label: string }> = [
  { id: 'daily', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'weekly', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: 'mtd', label: 'This month' },
  { id: 'monthly', label: '12 months' },
  { id: 'custom', label: 'Custom' },
];

/** Title, the period every figure on the page covers, and the end-of-day report. */
export function DashboardHeader(props: DashboardHeaderProps) {
  const { timeframe, setTimeframe, rangeLabel, isRefreshing } = props;
  return (
    // Three rows that never squeeze each other: title and report button, the periods, then the custom dates when chosen.
    <header className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-serif text-3xl tracking-tight text-neutral-950">Analytics</h1>
        <p className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
          <span>{rangeLabel}</span>
          <span className="text-neutral-300">·</span>
          {isRefreshing
            ? <span className="inline-flex items-center gap-1 text-neutral-500"><Loader2 className="h-3 w-3 animate-spin" /> Updating</span>
            : <span className="inline-flex items-center gap-1 text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live</span>}
        </p>
      </div>

        <button type="button" onClick={props.onOpenZReport} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-neutral-200 bg-white px-4 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 cursor-pointer">
          <FileText className="h-4 w-4" /> End-of-day Z-report
        </button>
      </div>

      <div className="min-w-0">
        {/* Seven periods: one row that scrolls sideways on a phone, never wrapping or squeezing. */}
        <div role="tablist" aria-label="Period" className="flex w-full min-w-0 gap-1 overflow-x-auto rounded-xl bg-neutral-100 p-1 [scrollbar-width:none] sm:w-fit">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={timeframe === t.id} onClick={() => setTimeframe(t.id)}
              className={`h-9 shrink-0 whitespace-nowrap rounded-lg px-3 text-xs font-semibold transition-colors cursor-pointer ${timeframe === t.id ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {timeframe === 'custom' && (
        <div>
          <DashboardCustomRangePicker
            startDate={props.startDate}
            setStartDate={props.setStartDate}
            endDate={props.endDate}
            setEndDate={props.setEndDate}
            onApplyCustomRange={props.onApplyCustomRange}
          />
        </div>
      )}
    </header>
  );
}

export default DashboardHeader;
