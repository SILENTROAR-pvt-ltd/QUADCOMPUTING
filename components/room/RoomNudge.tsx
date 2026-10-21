'use client';

import React from 'react';
import { ArrowRight, type LucideIcon } from 'lucide-react';

const TONES = {
  amber: { box: 'border-amber-200 bg-amber-50 hover:border-amber-400', icon: 'text-amber-700 ring-amber-200', arrow: 'text-amber-700' },
  neutral: { box: 'border-neutral-200 bg-white hover:border-neutral-900', icon: 'text-neutral-800 ring-neutral-200', arrow: 'text-neutral-500' },
} as const;

/** One row on the room's main tab that leads somewhere: stay longer, check out. A title, one line of why, an arrow. */
export function RoomNudge({ Icon, title, hint, tone = 'neutral', onClick }: { Icon: LucideIcon; title: string; hint: string; tone?: keyof typeof TONES; onClick: () => void }) {
  const t = TONES[tone];
  return (
    <button type="button" onClick={onClick} className={`flex w-full cursor-pointer items-center gap-3 rounded-[1.5rem] border p-4 text-left transition active:scale-[0.99] ${t.box}`}>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white ring-1 ring-inset ${t.icon}`}><Icon className="h-5 w-5" aria-hidden /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-neutral-950">{title}</span>
        <span className="block text-xs text-neutral-600">{hint}</span>
      </span>
      <ArrowRight className={`h-4 w-4 shrink-0 ${t.arrow}`} aria-hidden />
    </button>
  );
}
