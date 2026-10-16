'use client';

import React, { useState } from 'react';
import { CHROME } from './chart-tokens';
import { useMeasuredWidth } from './useMeasuredWidth';

export interface BarPoint { key: string; label: string; value: number }

interface Props {
  title: string;
  subtitle: string;
  data: BarPoint[];
  color: string;
  format: (n: number) => string;
  /** Shorter figures for the axis ticks; the tooltip always shows `format`. */
  axisFormat?: (n: number) => string;
  height?: number;
}

const PAD = { top: 14, right: 8, bottom: 24, left: 52 };

/** A round "nice" ceiling for the axis: 1, 2 or 5 times a power of ten. */
function niceMax(max: number): number {
  if (max <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(max));
  return [1, 2, 5, 10].map((m) => m * p).find((v) => v >= max) ?? 10 * p;
}

/** Bar with a 4px rounded top, anchored square to the baseline. */
function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/** One series per chart (a single y-scale), with a hover and focus tooltip per day. */
export function DailyBars({ title, subtitle, data, color, format, axisFormat = format, height = 190 }: Props) {
  const { ref, width } = useMeasuredWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const band = data.length ? plotW / data.length : plotW;
  const barW = Math.max(2, Math.min(28, band * 0.62));
  const labelEvery = Math.max(1, Math.ceil(data.length / 7));
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const tip = active !== null ? data[active] : null;

  return (
    <figure className="min-w-0">
      <figcaption>
        <p className="text-sm font-semibold text-neutral-900">{title}</p>
        <p className="text-[11px] text-neutral-500">{subtitle}</p>
      </figcaption>
      <div ref={ref} className="relative mt-3" onMouseLeave={() => setActive(null)}>
        <svg width={width} height={height} role="img" aria-label={`${title}. ${subtitle}`} className="block overflow-visible">
          {[0, 0.5, 1].map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(max * t)} y2={y(max * t)} stroke={t === 0 ? CHROME.baseline : CHROME.grid} strokeWidth={1} />
              <text x={PAD.left - 8} y={y(max * t)} dy="0.32em" textAnchor="end" fontSize={10} fill={CHROME.muted} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {axisFormat(max * t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const x = PAD.left + i * band + (band - barW) / 2;
            const h = Math.max(0, (d.value / max) * plotH);
            return (
              <g key={d.key}>
                {h > 0 && <path d={barPath(x, PAD.top + plotH - h, barW, h)} fill={color} opacity={active === null || active === i ? 1 : 0.45} />}
                {i % labelEvery === 0 && (
                  <text x={PAD.left + i * band + band / 2} y={height - 6} textAnchor="middle" fontSize={10} fill={CHROME.muted}>{d.label}</text>
                )}
                <rect x={PAD.left + i * band} y={PAD.top} width={band} height={plotH} fill="transparent" tabIndex={0}
                  aria-label={`${d.label}: ${format(d.value)}`} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onBlur={() => setActive(null)}
                  className="cursor-default outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-neutral-900" />
              </g>
            );
          })}
        </svg>
        {tip && active !== null && (
          <div role="status" className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[11px] shadow-md"
            style={{ left: Math.min(width - 60, Math.max(60, PAD.left + active * band + band / 2)), top: Math.max(0, y(tip.value) - 8) }}>
            <span className="block text-neutral-500">{tip.label}</span>
            <span className="block font-semibold tabular-nums text-neutral-950">{format(tip.value)}</span>
          </div>
        )}
      </div>
    </figure>
  );
}
