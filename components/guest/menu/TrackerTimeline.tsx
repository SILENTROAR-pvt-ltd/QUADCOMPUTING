'use client';

import React from 'react';
import { Check, ChefHat, ConciergeBell, Clock } from 'lucide-react';
import { resolveTrackerStage, stageStep, stepCopy, type TrackerStage } from './tracker/tracker-copy';

export interface TrackerTimelineProps {
  /** 0 received, 1 preparing, 2 ready or served. */
  currentStep: number;
  kotNumber?: string | null;
  status?: string | null;
  /** When given, wording follows it (ready and served read differently). Otherwise it is worked out from `status`. */
  stage?: TrackerStage;
}

const ICONS = [Clock, ChefHat, ConciergeBell];

/** Received, being prepared, ready: three steps down the side of the chef. The step the order is on glows softly. */
export function TrackerTimeline({ currentStep, status, stage }: TrackerTimelineProps) {
  const resolved = stage ?? resolveTrackerStage(status || '', '');
  const step = Math.min(Math.max(Number.isFinite(currentStep) ? currentStep : stageStep(resolved), 0), 2);
  const steps = stepCopy(resolved);
  // The last step is finished once the dish is served; a dish that is only ready is still the current step.
  const finished = resolved === 'served';

  return (
    <ol className="relative flex flex-col" aria-label="Order progress">
      {steps.map((s, idx) => {
        const Icon = ICONS[idx];
        const done = idx < step || (idx === 2 && finished);
        const current = idx === step && !(idx === 2 && finished);
        const last = idx === steps.length - 1;
        return (
          <li key={s.title} aria-current={current ? 'step' : undefined} className="relative flex gap-3.5 pb-5 last:pb-0">
            {!last && (
              <span aria-hidden className="absolute left-[17px] top-9 bottom-0 w-px bg-neutral-200">
                <span className={`block w-full bg-gradient-to-b from-[#c9a24a] to-[#0A3222] transition-all duration-700 ease-out ${idx < step ? 'h-full' : 'h-0'}`} />
              </span>
            )}
            <span
              aria-hidden
              className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-full transition-all duration-500 ${
                done
                  ? 'bg-[#0A3222] text-amber-100 ring-1 ring-[#c9a24a]/60'
                  : current
                    ? 'bg-white text-[#0A3222] ring-2 ring-[#c9a24a] shadow-[0_0_0_6px_rgba(201,162,74,0.16)]'
                    : 'bg-white text-neutral-300 ring-1 ring-neutral-200'
              }`}
            >
              {done ? <Check className="h-4 w-4" strokeWidth={2.4} /> : <Icon className="h-4 w-4" />}
            </span>
            <span className="min-w-0 pt-0.5">
              <span className={`block text-[13px] font-semibold leading-tight ${done || current ? 'text-zinc-950' : 'text-neutral-400'}`}>{s.title}</span>
              <span className={`mt-0.5 block text-[11.5px] leading-snug ${current ? 'text-zinc-600' : 'text-neutral-400'}`}>{s.subtitle}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default TrackerTimeline;
