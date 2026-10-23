import React from 'react';
import { Minus, Plus } from 'lucide-react';

const ROW = 'flex h-12 items-center justify-between rounded-2xl border border-[#e8dfcc] bg-[#fbf9f4] px-4 text-sm text-[#10231a]';
const STEP = 'grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] text-[#f5f1e8] ring-1 ring-[#d9c193]/35 transition active:scale-90 disabled:opacity-30';

/** How many are coming, with forest steppers. */
export function GuestStepper({ guests, onChange }: { guests: number; onChange: (n: number) => void }) {
  return (
    <div className={ROW}>
      <span>Guests</span>
      <span className="inline-flex items-center gap-3">
        <button type="button" aria-label="One fewer guest" disabled={guests <= 1} onClick={() => onChange(Math.max(1, guests - 1))} className={STEP}><Minus className="h-3.5 w-3.5" /></button>
        <span className="w-5 text-center font-semibold tabular-nums">{guests}</span>
        <button type="button" aria-label="One more guest" disabled={guests >= 20} onClick={() => onChange(Math.min(20, guests + 1))} className={STEP}><Plus className="h-3.5 w-3.5" /></button>
      </span>
    </div>
  );
}

export interface Arrival { id: string; title: string; hint: string }

/** When the guest expects to arrive: ivory cards, the chosen one in gold with a forest dot. */
export function ArrivalChoice({ arrivals, value, onChange }: { arrivals: Arrival[]; value: string; onChange: (id: string) => void }) {
  return (
    <fieldset className="pt-1">
      <legend className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8a6d3f]">When will you arrive?</legend>
      <div className="space-y-2">
        {arrivals.map((a) => {
          const on = value === a.id;
          return (
            <label key={a.id} className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm transition focus-within:ring-2 focus-within:ring-[#b08d57]/50 ${on ? 'border-[#b08d57] bg-[#fbf6e8] shadow-[0_0_0_3px_rgba(217,193,147,0.25)]' : 'border-[#e8dfcc] bg-[#fbf9f4] hover:border-[#d9c193]'}`}>
              <span><span className="block font-medium text-[#10231a]">{a.title}</span><span className="block text-xs text-[#10231a]/55">{a.hint}</span></span>
              <input type="radio" name="arrival" value={a.id} checked={on} onChange={() => onChange(a.id)} className="sr-only" />
              <span aria-hidden className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${on ? 'border-[#0f2a1e] bg-[#0f2a1e]' : 'border-[#d9c193] bg-white'}`}>
                {on && <span className="h-2 w-2 rounded-full bg-[#d9c193]" />}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
