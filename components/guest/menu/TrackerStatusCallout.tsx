'use client';

import React from 'react';

export interface TrackerStatusCalloutProps {
  items?: Array<{ name?: string; item_name?: string; quantity: number }>;
  /** True when these dishes were added to a table that already had an order. */
  isAddon?: boolean;
}

/** The dishes this order holds, as small ivory tags, under a gentle heading. Shows nothing when there are none. */
export function TrackerStatusCallout({ items, isAddon = false }: TrackerStatusCalloutProps) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-6 rounded-2xl border border-[#e6d9b8]/70 bg-white/70 px-4 py-3.5">
      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#8a6d2b]">Prepared for you</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px]">
        {items.slice(0, 4).map((it: any, idx) => (
          <span key={it.id || idx} className="rounded-full border border-neutral-200 bg-[#fcfaf4] px-2.5 py-1 font-medium text-zinc-800">
            {it.item_name || it.name} <span className="text-neutral-400">&times;{it.quantity}</span>
          </span>
        ))}
        {items.length > 4 && <span className="px-1 text-[11px] text-neutral-400">and {items.length - 4} more</span>}
      </div>
      {isAddon && <p className="mt-2 text-[11.5px] leading-snug text-neutral-500">Your additional items have joined the same order for your table.</p>}
    </div>
  );
}

export default TrackerStatusCallout;
