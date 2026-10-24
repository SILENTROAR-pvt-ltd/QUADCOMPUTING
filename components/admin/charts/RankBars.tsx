'use client';

import React from 'react';

export interface RankRow { id: string; label: string; sub?: string; value: number; display: string; extra?: string }

/** A ranked list with a bar per row (one series, so no legend); the value is always written beside its bar. */
export function RankBars({ rows, color = '#2a78d6', empty = 'Nothing to rank yet.' }: { rows: RankRow[]; color?: string; empty?: string }) {
  const max = Math.max(0, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-neutral-400">{empty}</p>;
  return (
    <ol className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.id} className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-x-3 gap-y-1">
          <span className="text-xs font-semibold tabular-nums text-neutral-400">{i + 1}</span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-neutral-900">{r.label}</span>
            {r.sub && <span className="block truncate text-[11px] text-neutral-500">{r.sub}</span>}
          </span>
          <span className="text-right">
            <span className="block text-sm font-semibold tabular-nums text-neutral-950">{r.display}</span>
            {r.extra && <span className="block text-[11px] text-neutral-500">{r.extra}</span>}
          </span>
          <span />
          <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
            <span className="block h-full rounded-full" style={{ width: `${max > 0 ? Math.max(2, (r.value / max) * 100) : 0}%`, background: color }} />
          </span>
        </li>
      ))}
    </ol>
  );
}
