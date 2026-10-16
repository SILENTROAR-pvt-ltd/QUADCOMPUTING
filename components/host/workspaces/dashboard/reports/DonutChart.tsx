'use client';

import React, { useState } from 'react';

export interface DonutSlice { id: string; label: string; value: number; color: string; detail?: string }

const SIZE = 156;
const R = 70;
const INNER = 48;
// A non-zero slice is drawn at least this wide so it can be seen and hovered; its label always gives the exact share.
const MIN_DEG = 3;

function arc(start: number, end: number) {
  const at = (deg: number, r: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [SIZE / 2 + r * Math.cos(a), SIZE / 2 + r * Math.sin(a)];
  };
  const large = end - start > 180 ? 1 : 0;
  const [x1, y1] = at(start, R); const [x2, y2] = at(end, R); const [x3, y3] = at(end, INNER); const [x4, y4] = at(start, INNER);
  return `M${x1},${y1}A${R},${R} 0 ${large} 1 ${x2},${y2}L${x3},${y3}A${INNER},${INNER} 0 ${large} 0 ${x4},${y4}Z`;
}

/** Part-to-whole for two to four parts, every part labelled with its value and share (never colour alone). */
export function DonutChart({ slices, format, centerLabel }: { slices: DonutSlice[]; format: (n: number) => string; centerLabel: string }) {
  const [active, setActive] = useState<string | null>(null);
  const total = slices.reduce((a, s) => a + Math.max(0, s.value), 0);
  const shown = slices.filter((s) => s.value > 0);

  // Widen tiny slices to MIN_DEG and take the difference from the largest, so the ring still closes at 360°.
  const degs = shown.map((s) => (total > 0 ? Math.max(MIN_DEG, (s.value / total) * 360) : 0));
  const excess = degs.reduce((a, d) => a + d, 0) - 360;
  if (excess > 0 && degs.length) { const i = degs.indexOf(Math.max(...degs)); degs[i] -= excess; }
  let cursor = 0;
  const arcs = shown.map((s, i) => { const start = cursor; cursor += degs[i]; return { ...s, start, end: cursor }; });
  const pct = (v: number) => (total > 0 ? `${Math.round((v / total) * 1000) / 10}%` : '0%');
  const focus = shown.find((s) => s.id === active);

  return (
    // The legend sits under the ring, full width, so a label is never squeezed out by its amount in a narrow card.
    <div className="flex flex-col items-center gap-4">
      <div className="relative shrink-0" onMouseLeave={() => setActive(null)}>
        <svg width={SIZE} height={SIZE} role="img" aria-label={slices.map((s) => `${s.label} ${format(s.value)} (${pct(s.value)})`).join(', ')}>
          {total === 0 ? <circle cx={SIZE / 2} cy={SIZE / 2} r={(R + INNER) / 2} fill="none" stroke="#e1e0d9" strokeWidth={R - INNER} />
            : arcs.length === 1 ? <circle cx={SIZE / 2} cy={SIZE / 2} r={(R + INNER) / 2} fill="none" stroke={arcs[0].color} strokeWidth={R - INNER} />
            : arcs.map((s) => (
              <path key={s.id} d={arc(s.start, s.end)} fill={s.color} stroke="#ffffff" strokeWidth={2} tabIndex={0} className="outline-none"
                opacity={active === null || active === s.id ? 1 : 0.45} aria-label={`${s.label}: ${format(s.value)}, ${pct(s.value)}`}
                onMouseEnter={() => setActive(s.id)} onFocus={() => setActive(s.id)} onBlur={() => setActive(null)} />
            ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <span className="text-sm font-semibold tabular-nums text-neutral-950">{focus ? pct(focus.value) : format(total)}</span>
          <span className="text-[10px] leading-tight text-neutral-500">{focus ? focus.label : centerLabel}</span>
        </div>
      </div>
      <ul className="w-full divide-y divide-neutral-100 text-xs">
        {slices.map((s) => (
          <li key={s.id} className={`grid grid-cols-[auto_1fr_auto] items-center gap-x-2.5 py-2 ${s.value > 0 ? '' : 'opacity-50'}`}>
            <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            <span className="min-w-0">
              <span className="block truncate font-medium text-neutral-800">{s.label}</span>
              {s.detail && <span className="block text-[11px] text-neutral-500">{s.detail}</span>}
            </span>
            <span className="text-right tabular-nums">
              <span className="block font-semibold text-neutral-950">{format(s.value)}</span>
              <span className="block text-[11px] text-neutral-500">{pct(s.value)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
