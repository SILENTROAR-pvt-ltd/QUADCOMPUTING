'use client';

import React from 'react';
import { addDays, nightsBetween, plural, shortDate, todayIst } from './stay-format';

interface Props { checkIn: string; checkOut: string; onChange: (checkIn: string, checkOut: string) => void; error?: string | null }

const field = 'h-12 w-full rounded-2xl border border-neutral-800 bg-neutral-900/80 px-3 text-sm text-white outline-none transition focus:border-amber-200/60 [color-scheme:dark]';

/** Check-in and check-out dates; the showcase re-reads availability for every change. */
export function StayDateStrip({ checkIn, checkOut, onChange, error }: Props) {
  const nights = nightsBetween(checkIn, checkOut);
  return (
    <section className="rounded-3xl border border-neutral-800 bg-neutral-900/50 p-4 sm:p-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-mono uppercase tracking-widest text-neutral-500">Check-in</span>
          <input type="date" value={checkIn} min={todayIst()} onChange={(e) => onChange(e.target.value, checkOut)} className={field} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-mono uppercase tracking-widest text-neutral-500">Check-out</span>
          <input type="date" value={checkOut} min={addDays(checkIn, 1)} onChange={(e) => onChange(checkIn, e.target.value)} className={field} />
        </label>
        <div className="col-span-2 text-sm text-neutral-300 sm:col-span-1 sm:pb-3">
          <span className="font-serif text-lg text-white">{plural(nights, 'night')}</span>
          <span className="ml-2 text-xs text-neutral-500">{shortDate(checkIn)} → {shortDate(checkOut)}</span>
        </div>
      </div>
      {error && <p className="mt-3 text-xs text-amber-200">{error}</p>}
    </section>
  );
}
