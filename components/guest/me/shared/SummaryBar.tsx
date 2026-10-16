import React from 'react';

/** Three figures for the current filter, side by side: label above, value below, each in its own tone. */
export function SummaryBar({ items }: { items: Array<{ label: string; value: string; tone?: string }> }) {
  return (
    <div className="grid grid-cols-3 divide-x divide-neutral-100 border-y border-neutral-100 bg-neutral-50/60 text-center">
      {items.map((i) => (
        <div key={i.label} className="py-3">
          <p className="text-[10px] uppercase tracking-wider text-neutral-500">{i.label}</p>
          <p className={`font-semibold ${i.tone ?? 'text-neutral-950'}`}>{i.value}</p>
        </div>
      ))}
    </div>
  );
}
