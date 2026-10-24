'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { monotonePath } from './curve';
import { niceTicks } from './ticks';

export interface LineSeries { name: string; color: string }
export interface LinePoint { key: string; label: string; values: number[]; note?: string }

const PAD = { l: 44, r: 12, t: 12, b: 26 };

/** Lines over time on one axis: 2px smooth lines, a highlighted column and dots on hover, a tooltip, a legend. */
export function LineChart({ points, series, format, axis, height = 260 }: {
  points: LinePoint[]; series: LineSeries[]; format: (n: number) => string; axis: (n: number) => string; height?: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  // Starts narrow so the first paint never widens its card; the real width arrives from the observer at once.
  const [w, setW] = useState(200);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ticks = useMemo(() => niceTicks(Math.max(0, ...points.flatMap((p) => p.values))), [points]);
  const top = ticks[ticks.length - 1] || 1;
  const iw = w - PAD.l - PAD.r; const ih = height - PAD.t - PAD.b;
  const step = points.length > 1 ? iw / (points.length - 1) : 0;
  const x = (i: number) => PAD.l + (points.length > 1 ? i * step : iw / 2);
  const y = (v: number) => PAD.t + ih - (Math.max(0, v) / top) * ih;
  const every = Math.max(1, Math.ceil(points.length / 7));
  const empty = points.every((p) => p.values.every((v) => !v));

  return (
    <div ref={box} className="relative w-full min-w-0 select-none overflow-hidden" onMouseLeave={() => setHover(null)}>
      <ul className="mb-2 flex flex-wrap justify-end gap-4 text-[11px] text-neutral-600" aria-label="Legend">
        {series.map((s) => <li key={s.name} className="flex items-center gap-1.5"><span aria-hidden className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.name}</li>)}
      </ul>
      <svg width={w} height={height} role="img" aria-label={`${series.map((s) => s.name).join(' and ')} by day`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={w - PAD.r} y1={y(t)} y2={y(t)} stroke="#ececea" />
            <text x={PAD.l - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#898781">{axis(t)}</text>
          </g>
        ))}
        {hover !== null && <rect x={x(hover) - Math.max(10, step / 2)} y={PAD.t} width={Math.max(20, step)} height={ih} rx={8} fill="#2a78d6" opacity={0.07} />}
        {series.map((s, k) => (
          <path key={s.name} d={monotonePath(points.map((p, i) => [x(i), y(p.values[k] || 0)]))} fill="none" stroke={s.color} strokeWidth={2} strokeLinecap="round" />
        ))}
        {hover !== null && series.map((s, k) => (
          <circle key={s.name} cx={x(hover)} cy={y(points[hover].values[k] || 0)} r={4.5} fill={s.color} stroke="#fff" strokeWidth={2} />
        ))}
        {points.map((p, i) => (i % every === 0 || i === points.length - 1) && (
          <text key={p.key} x={x(i)} y={height - 8} textAnchor={i === points.length - 1 && i > 0 ? 'end' : i === 0 && points.length > 1 ? 'start' : 'middle'} fontSize="10" fill={hover === i ? '#0b0b0b' : '#898781'} fontWeight={hover === i ? 600 : 400}>{p.label}</text>
        ))}
        {points.map((p, i) => (
          <rect key={p.key} x={x(i) - Math.max(6, step / 2)} y={PAD.t} width={Math.max(12, step)} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
      </svg>
      {hover !== null && (
        <div role="tooltip" className="pointer-events-none absolute z-10 min-w-[10rem] rounded-xl border border-neutral-200 bg-white p-2.5 text-left shadow-lg"
          style={{ left: Math.min(Math.max(0, x(hover) - 80), w - 170), top: 28 }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{points[hover].label}</p>
          {series.map((s, k) => (
            <p key={s.name} className="mt-0.5 flex items-center justify-between gap-3 text-xs text-neutral-700">
              <span className="flex items-center gap-1.5"><span aria-hidden className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.name}</span>
              <b className="tabular-nums text-neutral-950">{format(points[hover].values[k] || 0)}</b>
            </p>
          ))}
          {points[hover].note && <p className="mt-1 text-[11px] text-neutral-500">{points[hover].note}</p>}
        </div>
      )}
      {empty && <p className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">No settled bills in this period yet.</p>}
    </div>
  );
}
