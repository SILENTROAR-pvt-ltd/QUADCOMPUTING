'use client';

import React from 'react';
import { CalendarDays, MoonStar } from 'lucide-react';
import { addDays, nightsBetween, plural, shortDate, todayIst } from './stay-format';

interface Props { checkIn: string; checkOut: string; onChange: (checkIn: string, checkOut: string) => void; error?: string | null }

const field = 'h-12 w-full rounded-2xl border border-[#e8dfcc] bg-[#f8f4ea] pl-10 pr-3 text-sm font-medium text-[#10231a] outline-none transition focus:border-[#b08d57] focus:ring-4 focus:ring-[#d9c193]/20 [color-scheme:light]';
const label = 'mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8a6d3f]';

/** Check-in and check-out dates; the showcase re-reads availability for every change. */
export function StayDateStrip({ checkIn, checkOut, onChange, error }: Props) {
  const nights = nightsBetween(checkIn, checkOut);
  return (
    <section aria-label="Your dates" className="rounded-[1.75rem] border border-[#e8dfcc] bg-[#fbf9f4] p-4 shadow-[0_18px_40px_-32px_rgba(15,42,30,0.45)] sm:p-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:gap-4">
        <label className="block">
          <span className={label}>Check-in</span>
          <span className="relative block">
            <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b08d57]" aria-hidden />
            <input type="date" value={checkIn} min={todayIst()} onChange={(e) => onChange(e.target.value, checkOut)} className={field} />
          </span>
        </label>
        <label className="block">
          <span className={label}>Check-out</span>
          <span className="relative block">
            <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b08d57]" aria-hidden />
            <input type="date" value={checkOut} min={addDays(checkIn, 1)} onChange={(e) => onChange(checkIn, e.target.value)} className={field} />
          </span>
        </label>
        <div className="col-span-2 flex h-12 items-center justify-between gap-3 rounded-2xl bg-[#0f2a1e] px-4 text-[#f5f1e8] sm:col-span-1 sm:min-w-[13rem]">
          <span className="inline-flex items-center gap-2 text-sm font-semibold"><MoonStar className="h-4 w-4 text-[#d9c193]" aria-hidden />{plural(nights, 'night')}</span>
          <span className="text-xs text-[#f5f1e8]/70">{shortDate(checkIn)} → {shortDate(checkOut)}</span>
        </div>
      </div>
      {error && <p role="alert" className="mt-3 text-xs text-[#6f5631]">{error}</p>}
    </section>
  );
}
