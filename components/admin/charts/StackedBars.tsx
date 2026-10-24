'use client';

import React, { useMemo, useState } from 'react';
import { niceTicks } from './ticks';

export interface BarSeries { name: string; color: string }
export interface BarPoint { key: string; label: string; values: number[]; note?: string }

/**
 * Stacked bars over time, one stack per point: series in fixed colour order, a 2px surface gap between segments,
 * rounded data end, a legend (for two or more series), a recessive grid and a tooltip per bar.
 */
export function StackedBars({ points, series, format, axis, height = 240, empty = 'Nothing yet in this period.' }: {
  points: BarPoint[]; series: BarSeries[]; format: (n: number) => string; axis: (n: number) => string; height?: number; empty?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const totals = points.map((p) => p.values.reduce((a, v) => a + Math.max(0, v), 0));
  const ticks = useMemo(() => niceTicks(Math.max(0, ...totals)), [totals]);
  const top = ticks[ticks.length - 1] || 1;
  const every = Math.max(1, Math.ceil(points.length / 8));
  const allZero = totals.every((t) => t === 0);

  return (
    <div className="space-y-3">
      {series.length > 1 && (
        <ul className="flex flex-wrap gap-4 text-[11px] text-neutral-600" aria-label="Legend">
          {series.map((s) => <li key={s.name} className="flex items-center gap-1.5"><span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />{s.name}</li>)}
        </ul>
      )}
      <div className="relative select-none" style={{ height }} onMouseLeave={() => setHover(null)}>
        <div className="absolute bottom-6 left-12 right-0 top-2">
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-[#e1e0d9]" style={{ bottom: `${(t / top) * 100}%` }}>
              <span className="absolute -left-12 w-10 -translate-y-1/2 text-right text-[10px] tabular-nums text-[#898781]">{axis(t)}</span>
            </div>
          ))}
        </div>
        <div className="absolute bottom-6 left-12 right-0 top-2 flex items-end gap-[3px] border-b border-[#c3c2b7]">
          {points.map((p, i) => (
            <div key={p.key} className="relative flex h-full flex-1 items-end justify-center" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0}
              aria-label={`${p.label}: ${format(totals[i])}`}>
              <div className={`flex w-full max-w-[22px] flex-col-reverse gap-[2px] ${hover !== null && hover !== i ? 'opacity-50' : ''}`} style={{ height: `${(totals[i] / top) * 100}%` }}>
                {p.values.map((v, s) => v > 0 && (
                  <div key={s} className={s === p.values.length - 1 || p.values.slice(s + 1).every((x) => x <= 0) ? 'rounded-t-[4px]' : ''}
                    style={{ flexGrow: v, flexBasis: 0, minHeight: 2, background: series[s].color }} />
                ))}
              </div>
              {hover === i && (
                <div role="tooltip" className={`pointer-events-none absolute bottom-full z-10 mb-2 min-w-[10rem] rounded-xl border border-neutral-200 bg-white p-2.5 text-left shadow-lg ${i > points.length / 2 ? 'right-0' : 'left-0'}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{p.label}</p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums text-neutral-950">{format(totals[i])}</p>
                  {series.length > 1 && series.map((s, k) => (
                    <p key={s.name} className="flex items-center gap-1.5 text-[11px] text-neutral-600"><span aria-hidden className="h-2 w-2 rounded-sm" style={{ background: s.color }} />{s.name} {format(p.values[k] || 0)}</p>
                  ))}
                  {p.note && <p className="text-[11px] text-neutral-500">{p.note}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="absolute bottom-0 left-12 right-0 flex gap-[3px]">
          {points.map((p, i) => <span key={p.key} className="flex-1 truncate text-center text-[10px] text-[#898781]">{i % every === 0 ? p.label : ''}</span>)}
        </div>
        {allZero && <p className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">{empty}</p>}
      </div>
    </div>
  );
}
