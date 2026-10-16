'use client';

import React from 'react';
import type { TableChoice } from './useReserveForm';

export const fmt12 = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
};

export const dayLabel = (iso: string, todayIso: string) =>
  iso === todayIso ? 'Today' : new Date(`${iso}T00:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

const chip = (on: boolean) =>
  `h-10 min-w-[4.5rem] shrink-0 cursor-pointer rounded-full px-3.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
    on ? 'bg-neutral-950 text-white' : 'border border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
  }`;

export function DatePicker({ dates, value, onChange }: { dates: string[]; value: string; onChange: (d: string) => void }) {
  return (
    <div role="group" aria-label="Date" className="flex gap-2 overflow-x-auto pb-1">
      {dates.map((d) => (
        <button key={d} type="button" aria-pressed={value === d} onClick={() => onChange(d)} className={chip(value === d)}>
          {dayLabel(d, dates[0])}
        </button>
      ))}
    </div>
  );
}

export function SlotPicker({ slots, value, onChange }: { slots: string[] | null; value: string | null; onChange: (t: string) => void }) {
  if (slots === null) return <div className="h-10 animate-pulse rounded-full bg-neutral-100" aria-busy="true" />;
  if (slots.length === 0) return <p className="text-sm text-neutral-500">No bookable times on this day.</p>;
  return (
    <div role="group" aria-label="Time" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {slots.map((t) => (
        <button key={t} type="button" aria-pressed={value === t} onClick={() => onChange(t)} className={chip(value === t)}>{fmt12(t)}</button>
      ))}
    </div>
  );
}

export function PartyStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-neutral-200 bg-white p-1">
      <button type="button" aria-label="Fewer guests" disabled={value <= 1} onClick={() => onChange(value - 1)}
        className="h-9 w-9 cursor-pointer rounded-full text-lg text-neutral-700 hover:bg-neutral-100 disabled:opacity-30">−</button>
      <span className="min-w-[5.5rem] text-center text-sm font-semibold tabular-nums" aria-live="polite">{value} {value === 1 ? 'guest' : 'guests'}</span>
      <button type="button" aria-label="More guests" disabled={value >= 20} onClick={() => onChange(value + 1)}
        className="h-9 w-9 cursor-pointer rounded-full text-lg text-neutral-700 hover:bg-neutral-100 disabled:opacity-30">+</button>
    </div>
  );
}

interface TablePickerProps {
  tables: TableChoice[] | null;
  partySize: number;
  value: string | null;
  onChange: (id: string | null) => void;
  anyFits: boolean;
}

/** Auto assigns the smallest free table that seats the party; a guest can instead pick a specific table. */
export function TablePicker({ tables, partySize, value, onChange, anyFits }: TablePickerProps) {
  if (tables === null) return <div className="h-10 animate-pulse rounded-full bg-neutral-100" aria-busy="true" />;
  return (
    <div className="space-y-2">
      <div role="group" aria-label="Table" className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={value === null} onClick={() => onChange(null)} disabled={!anyFits} className={chip(value === null)}>Any free table</button>
        {tables.map((t) => {
          const fits = t.free && t.seats >= partySize;
          return (
            <button key={t.id} type="button" aria-pressed={value === t.id} disabled={!fits} onClick={() => onChange(t.id)} className={chip(value === t.id)}
              title={!t.free ? 'Taken at this time' : t.seats < partySize ? `Seats ${t.seats}` : undefined}>
              {t.label} · {t.seats}
            </button>
          );
        })}
      </div>
      {!anyFits && <p role="alert" className="text-sm text-rose-700">No table is free for {partySize} at this time. Try another time.</p>}
    </div>
  );
}
