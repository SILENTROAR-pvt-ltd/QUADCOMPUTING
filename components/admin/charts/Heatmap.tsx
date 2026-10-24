'use client';

import React, { useState } from 'react';

// One hue, light to dark (sequential blue). The lightest step means "almost none" and may recede into the surface.
const RAMP = ['#f4f8fe', '#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const hourLabel = (h: number) => (h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`);

/** Settled bills by weekday and hour (IST), a cell per hour, with a tooltip and a scale; the grid is also a table. */
export function Heatmap({ grid, unit = 'bills' }: { grid: number[][]; unit?: string }) {
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null);
  const max = Math.max(0, ...grid.flat());
  const step = (v: number) => (v <= 0 || max === 0 ? 0 : Math.min(RAMP.length - 1, 1 + Math.floor((v / max) * (RAMP.length - 2) + 0.0001)));
  const busiest = max > 0 ? grid.flatMap((row, d) => row.map((v, h) => ({ v, d, h }))).sort((a, b) => b.v - a.v)[0] : null;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-[2px] text-[10px]" aria-label={`Settled ${unit} by weekday and hour`}>
          <thead>
            <tr><th scope="col" className="w-9" />{Array.from({ length: 24 }, (_, h) => <th key={h} scope="col" className="font-normal text-[#898781]">{h % 3 === 0 ? hourLabel(h) : ''}</th>)}</tr>
          </thead>
          <tbody onMouseLeave={() => setHover(null)}>
            {grid.map((row, d) => (
              <tr key={DAYS[d]}>
                <th scope="row" className="pr-1 text-right font-medium text-neutral-500">{DAYS[d]}</th>
                {row.map((v, h) => (
                  <td key={h} className="relative h-6 rounded-[4px]" style={{ background: RAMP[step(v)] }} onMouseEnter={() => setHover({ d, h })}
                    aria-label={`${DAYS[d]} ${hourLabel(h)}: ${v} ${unit}`}>
                    {hover?.d === d && hover?.h === h && (
                      <span role="tooltip" className={`pointer-events-none absolute bottom-full z-10 mb-1.5 whitespace-nowrap rounded-lg border border-neutral-200 bg-white px-2 py-1 text-[11px] text-neutral-800 shadow-md ${h > 16 ? 'right-0' : 'left-0'}`}>
                        {DAYS[d]} {hourLabel(h)}–{hourLabel((h + 1) % 24)} · <b>{v}</b> {unit}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-neutral-500">
        <span className="flex items-center gap-1.5">Fewer {RAMP.slice(1).map((c) => <span key={c} aria-hidden className="h-2.5 w-4 rounded-[3px]" style={{ background: c }} />)} More</span>
        {busiest && <span>Busiest: <b className="text-neutral-800">{DAYS[busiest.d]} {hourLabel(busiest.h)}</b> ({busiest.v} {unit})</span>}
      </div>
    </div>
  );
}
