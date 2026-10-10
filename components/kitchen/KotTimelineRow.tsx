'use client';

import React from 'react';
import { minutesBetween, type KotTimeline } from '@/lib/utils/kot-timeline';
import { clockTime } from './kot-status-style';

/** Placed → Started → Ready → Served, with the clock time of each and the minutes each step took. */
export function KotTimelineRow({ timeline }: { timeline: KotTimeline }) {
  const { stages } = timeline;
  return (
    <ol aria-label="Order timeline" className="grid grid-cols-4 gap-1">
      {stages.map((stage, i) => {
        const prev = i > 0 ? stages[i - 1].at : null;
        const took = stage.at && prev ? minutesBetween(prev, stage.at) : null;
        const reached = Boolean(stage.at);
        const nextReached = i < stages.length - 1 && Boolean(stages[i + 1].at);
        return (
          <li key={stage.key} className="min-w-0">
            <div className="flex items-center gap-1" aria-hidden="true">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${reached ? 'bg-neutral-950' : 'border border-neutral-300 bg-white'}`} />
              {i < stages.length - 1 && <span className={`h-px flex-1 ${nextReached ? 'bg-neutral-950' : 'bg-neutral-200'}`} />}
            </div>
            <p className={`mt-1 text-[10px] font-semibold uppercase tracking-wide ${reached ? 'text-neutral-700' : 'text-neutral-400'}`}>
              {stage.label}
            </p>
            <p className="font-mono text-[11px] text-neutral-900">{clockTime(stage.at) ?? '—'}</p>
            {took !== null && <p className="text-[10px] text-neutral-500">+{took}m</p>}
          </li>
        );
      })}
    </ol>
  );
}

export default KotTimelineRow;
