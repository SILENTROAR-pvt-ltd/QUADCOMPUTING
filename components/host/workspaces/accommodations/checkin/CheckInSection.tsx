'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface Props { icon: LucideIcon; title: string; hint?: string; aside?: React.ReactNode; children: React.ReactNode }

/** One part of the check-in form: a short title, what it is for, and its fields, in the same frame as every other part. */
export function CheckInSection({ icon: Icon, title, hint, aside, children }: Props) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5" aria-label={title}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-neutral-100 text-neutral-700"><Icon className="h-4 w-4" aria-hidden /></span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-neutral-950">{title}</h3>
            {hint && <p className="truncate text-xs text-neutral-500">{hint}</p>}
          </div>
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
      {children}
    </section>
  );
}
