'use client';

import React, { useState } from 'react';
import { formatRupees } from '../wallet/money';
import { CHROME, SERIES } from './chart-tokens';

interface Props { revenue: number; fees: number; loaded: boolean }

const SIZE = 180;
const R = 80;
const INNER = 56;
// A slice this small is drawn at least this wide so it can be seen and hovered. Its label always gives the exact share.
const MIN_DEG = 3;

function arc(start: number, end: number) {
  const toXY = (deg: number, r: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [SIZE / 2 + r * Math.cos(a), SIZE / 2 + r * Math.sin(a)];
  };
  const large = end - start > 180 ? 1 : 0;
  const [x1, y1] = toXY(start, R); const [x2, y2] = toXY(end, R);
  const [x3, y3] = toXY(end, INNER); const [x4, y4] = toXY(start, INNER);
  return `M${x1},${y1}A${R},${R} 0 ${large} 1 ${x2},${y2}L${x3},${y3}A${INNER},${INNER} 0 ${large} 0 ${x4},${y4}Z`;
}

const pct = (part: number, whole: number) => (whole > 0 ? `${((part / whole) * 100).toFixed(part / whole < 0.1 ? 2 : 1)}%` : '0%');

/** You earn against we earn, all time: the venue's revenue and the platform fees, as shares of the two together. */
export function EarnShareDonut({ revenue, fees, loaded }: Props) {
  const [active, setActive] = useState<'you' | 'we' | null>(null);
  const total = revenue + fees;
  const feeDeg = total > 0 ? Math.min(360 - MIN_DEG, Math.max(fees > 0 ? MIN_DEG : 0, (fees / total) * 360)) : 0;
  const slices = [
    { id: 'we' as const, label: 'We earn', value: fees, color: SERIES.weEarn, start: 0, end: feeDeg },
    { id: 'you' as const, label: 'You earn', value: revenue, color: SERIES.youEarn, start: feeDeg, end: 360 },
  ].filter((s) => s.end - s.start > 0);

  return (
    <figure className="flex min-w-0 flex-col">
      <figcaption>
        <p className="text-sm font-semibold text-neutral-900">You earn vs we earn</p>
        <p className="text-[11px] text-neutral-500">All time · settled-bill revenue and platform fees</p>
      </figcaption>
      <div className="mt-3 flex flex-1 flex-col items-center gap-4 sm:flex-row sm:items-center lg:flex-col">
        <div className="relative shrink-0" onMouseLeave={() => setActive(null)}>
          <svg width={SIZE} height={SIZE} role="img" aria-label={`You earn ${formatRupees(revenue)}, we earn ${formatRupees(fees)}. Platform fees are ${pct(fees, total)} of the two together.`}>
            {!loaded || total === 0 ? (
              <circle cx={SIZE / 2} cy={SIZE / 2} r={(R + INNER) / 2} fill="none" stroke={CHROME.grid} strokeWidth={R - INNER} />
            ) : slices.length === 1 ? (
              <circle cx={SIZE / 2} cy={SIZE / 2} r={(R + INNER) / 2} fill="none" stroke={slices[0].color} strokeWidth={R - INNER} />
            ) : (
              slices.map((s) => (
                <path key={s.id} d={arc(s.start, s.end)} fill={s.color} stroke={CHROME.surface} strokeWidth={2}
                  opacity={active === null || active === s.id ? 1 : 0.45} tabIndex={0}
                  aria-label={`${s.label}: ${formatRupees(s.value)}, ${pct(s.value, total)}`}
                  onMouseEnter={() => setActive(s.id)} onFocus={() => setActive(s.id)} onBlur={() => setActive(null)} className="outline-none" />
              ))
            )}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-lg font-semibold tabular-nums text-neutral-950">{loaded ? pct(active === 'you' ? revenue : fees, total) : '—'}</span>
            <span className="text-[10px] text-neutral-500">{active === 'you' ? 'you earn' : 'platform fee'}</span>
          </div>
        </div>
        <ul className="w-full min-w-0 space-y-2 text-xs">
          {[{ id: 'you', label: 'You earn', value: revenue, color: SERIES.youEarn }, { id: 'we', label: 'We earn', value: fees, color: SERIES.weEarn }].map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 whitespace-nowrap text-neutral-700">
                <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />{s.label}
              </span>
              <span className="shrink-0 text-right tabular-nums">
                <span className="font-semibold text-neutral-950">{loaded ? formatRupees(s.value) : '—'}</span>
                <span className="ml-1.5 text-neutral-500">{loaded ? pct(s.value, total) : ''}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}
