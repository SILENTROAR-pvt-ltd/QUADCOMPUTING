'use client';

import React from 'react';
import { CalendarDays, MoonStar } from 'lucide-react';
import { addDays, nightsBetween, plural, shortDate, todayIst } from './stay-format';

interface Props { checkIn: string; checkOut: string; onChange: (checkIn: string, checkOut: string) => void; error?: string | null }

const field = 'h-12 w-full rounded-2xl border border-neutral-200 bg-white pl-10 pr-3 text-sm font-medium text-neutral-950 outline-none transition focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 [color-scheme:light]';
const label = 'mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500';

/** Check-in and check-out dates; the showcase re-reads availability for every change. */
export function StayDateStrip({ checkIn, checkOut, onChange, error }: Props) {
  const nights = nightsBetween(checkIn, checkOut);
  return (
    <section aria-label="Your dates" className="rounded-[1.75rem] border border-[#e6d9b8] bg-white p-4 shadow-[0_18px_40px_-32px_rgba(10,50,34,0.45)] sm:p-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:gap-4">
        <label className="block">
          <span className={label}>Check-in</span>
          <span className="relative block">
            <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
            <input type="date" value={checkIn} min={todayIst()} onChange={(e) => onChange(e.target.value, checkOut)} className={field} />
          </span>
        </label>
        <label className="block">
          <span className={label}>Check-out</span>
          <span className="relative block">
            <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
            <input type="date" value={checkOut} min={addDays(checkIn, 1)} onChange={(e) => onChange(checkIn, e.target.value)} className={field} />
          </span>
        </label>
        <div className="col-span-2 flex h-12 items-center justify-between gap-3 rounded-2xl bg-[#faf9f6] px-4 ring-1 ring-[#e6d9b8]/80 sm:col-span-1 sm:min-w-[13rem]">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-950"><MoonStar className="h-4 w-4 text-amber-600" aria-hidden />{plural(nights, 'night')}</span>
          <span className="text-xs text-neutral-500">{shortDate(checkIn)} → {shortDate(checkOut)}</span>
        </div>
      </div>
      {error && <p role="alert" className="mt-3 text-xs text-amber-800">{error}</p>}
    </section>
  );
}
