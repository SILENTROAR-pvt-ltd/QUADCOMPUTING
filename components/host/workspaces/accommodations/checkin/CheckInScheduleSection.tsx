'use client';

import React from 'react';
import { CalendarDays } from 'lucide-react';
import { CheckInSection } from './CheckInSection';
import { INPUT, LABEL } from './field-styles';

interface Props {
  checkInTime: string; onCheckInChange: (val: string) => void;
  checkOutTime: string; onCheckOutChange: (val: string) => void;
  nights: string; setNights: (val: string) => void;
  adultsCount: string; setAdultsCount: (val: string) => void;
  childrenCount: string; setChildrenCount: (val: string) => void;
}

function Counter({ id, label, value, min, max, onChange }: { id: string; label: string; value: string; min: number; max: number; onChange: (v: string) => void }) {
  const n = parseInt(value, 10) || min;
  const set = (v: number) => onChange(String(Math.min(max, Math.max(min, v))));
  return (
    <div>
      <label htmlFor={id} className={LABEL}>{label}</label>
      <div className="flex h-11 items-stretch overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <button type="button" onClick={() => set(n - 1)} disabled={n <= min} aria-label={`Fewer ${label.toLowerCase()}`} className="w-10 shrink-0 cursor-pointer text-lg text-neutral-600 hover:bg-neutral-50 disabled:opacity-30">−</button>
        <input id={id} type="number" inputMode="numeric" min={min} max={max} value={value} onChange={(e) => onChange(e.target.value)} className="min-w-0 flex-1 border-x border-neutral-200 text-center text-sm font-semibold text-neutral-950 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
        <button type="button" onClick={() => set(n + 1)} disabled={n >= max} aria-label={`More ${label.toLowerCase()}`} className="w-10 shrink-0 cursor-pointer text-lg text-neutral-600 hover:bg-neutral-50 disabled:opacity-30">+</button>
      </div>
    </div>
  );
}

/** When the stay runs and who is in the room. Nights and the check-out date move together. */
export function CheckInScheduleSection(p: Props) {
  return (
    <CheckInSection icon={CalendarDays} title="Stay" hint="Check-out is expected; the bill counts the nights actually stayed.">
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="checkInTime" className={LABEL}>Check-in</label>
            <input id="checkInTime" type="datetime-local" required value={p.checkInTime} onChange={(e) => p.onCheckInChange(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label htmlFor="checkOutTime" className={LABEL}>Expected check-out</label>
            <input id="checkOutTime" type="datetime-local" required value={p.checkOutTime} onChange={(e) => p.onCheckOutChange(e.target.value)} className={INPUT} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Counter id="stayNights" label="Nights" value={p.nights} min={1} max={90} onChange={p.setNights} />
          <Counter id="adultsCount" label="Adults" value={p.adultsCount} min={1} max={10} onChange={p.setAdultsCount} />
          <Counter id="childrenCount" label="Children" value={p.childrenCount} min={0} max={6} onChange={p.setChildrenCount} />
        </div>
      </div>
    </CheckInSection>
  );
}
