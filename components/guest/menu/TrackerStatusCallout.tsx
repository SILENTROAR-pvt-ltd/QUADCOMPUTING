'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

export interface TrackerStatusCalloutProps {
  items?: Array<{ name?: string; item_name?: string; quantity: number }>;
}

export function TrackerStatusCallout({ items }: TrackerStatusCalloutProps) {
  return (
    <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/5 via-emerald-500/5 to-transparent border border-neutral-200/60 flex items-start sm:items-center gap-3.5">
      <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 shrink-0 shadow-2xs">
        <Sparkles className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0 text-xs text-neutral-700 leading-relaxed">
        <p>
          <span className="font-semibold text-neutral-900">Executive Kitchen Note:</span>{' '}
          Dishes are freshly crafted, presentation-checked, and dispatched hot to your table.
        </p>
        {items && items.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[11px] text-neutral-500">
            <span className="font-semibold text-neutral-800">Active Dishes:</span>
            {items.slice(0, 3).map((it: any, idx) => (
              <span
                key={it.id || idx}
                className="bg-white px-2 py-0.5 rounded-md text-neutral-800 border border-neutral-200/80 shadow-2xs font-medium"
              >
                {it.item_name || it.name} &times;{it.quantity}
              </span>
            ))}
            {items.length > 3 && (
              <span className="text-neutral-400 font-mono text-[10px]">
                +{items.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
