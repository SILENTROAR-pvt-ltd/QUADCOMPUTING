'use client';

import React, { useMemo, useState } from 'react';
import type { DashboardChartPoint } from './dashboard.types';
import { axisTicks, compactInr } from './chart-scale';

interface RevenueBarChartProps {
  points: DashboardChartPoint[];
  formatCurrency: (n: number) => string;
}

/** Settled sales per hour, day or month as bars, with cost of goods beside them. Plain HTML, so text stays crisp. */
export function RevenueBarChart({ points, formatCurrency }: RevenueBarChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const ticks = useMemo(() => axisTicks(Math.max(0, ...points.map((p) => Math.max(p.revenue, p.expenses ?? 0)))), [points]);
  const top = ticks[ticks.length - 1];
  const labelEvery = Math.max(1, Math.ceil(points.length / 8));
  const empty = points.every((p) => !p.revenue && !p.expenses);
  const pct = (v: number) => (v > 0 ? Math.max(1.5, (v / top) * 100) : 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-[11px] text-neutral-500">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-neutral-900" /> Settled sales</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> Cost of goods</span>
      </div>

      <div className="relative h-64 select-none" onMouseLeave={() => setHover(null)}>
        <div className="absolute bottom-6 left-12 right-0 top-0">
          {ticks.map((t) => (
            <div key={t} className="absolute left-0 right-0 border-t border-dashed border-neutral-200" style={{ bottom: `${(t / top) * 100}%` }}>
              <span className="absolute -left-12 w-11 -translate-y-1/2 text-right font-mono text-[10px] text-neutral-400">{compactInr(t)}</span>
            </div>
          ))}
        </div>

        <div className="absolute bottom-6 left-12 right-0 top-0 flex items-end gap-[3px]">
          {points.map((p, i) => (
            <div key={p.timestamp + i} className="relative flex h-full flex-1 items-end justify-center gap-[2px]" onMouseEnter={() => setHover(i)}>
              <div className={`w-full max-w-[18px] rounded-t-[3px] transition-colors ${hover === i ? 'bg-emerald-600' : 'bg-neutral-900'}`} style={{ height: `${pct(p.revenue)}%` }} />
              <div className="w-full max-w-[8px] rounded-t-[3px] bg-amber-400" style={{ height: `${pct(p.expenses ?? 0)}%` }} />
              {hover === i && (
                <div className={`pointer-events-none absolute bottom-full z-10 mb-2 min-w-[9rem] rounded-xl border border-neutral-200 bg-white p-2.5 text-left shadow-lg ${i > points.length / 2 ? 'right-0' : 'left-0'}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{p.label}</p>
                  <p className="mt-0.5 font-mono text-sm font-bold text-neutral-950">{formatCurrency(p.revenue)}</p>
                  <p className="text-[11px] text-neutral-500">{p.orders} {p.orders === 1 ? 'bill' : 'bills'} · cost {formatCurrency(p.expenses ?? 0)}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="absolute bottom-0 left-12 right-0 flex gap-[3px]">
          {points.map((p, i) => (
            <span key={p.timestamp + i} className="flex-1 truncate text-center text-[10px] text-neutral-400">
              {i % labelEvery === 0 ? p.label : ''}
            </span>
          ))}
        </div>

        {empty && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">No settled sales in this period yet.</p>
        )}
      </div>
    </div>
  );
}

export default RevenueBarChart;
