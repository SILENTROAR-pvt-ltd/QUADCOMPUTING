'use client';

import React from 'react';
import { Minus, Plus } from 'lucide-react';

export interface PoolValue { total: string; split: boolean; men: string }

const num = (v: string) => (Number.isInteger(Number(v)) && Number(v) >= 0 ? Number(v) : 0);

/** The seats a pool gives each gender; women are always what is left of the pool after the men. */
export function splitOf(p: PoolValue): { total: number; men: number; women: number } {
  const total = num(p.total);
  const men = Math.min(num(p.men), total);
  return { total, men, women: total - men };
}

/** What the form sends: the pool, and the split only if the host chose one. */
export function poolPayload(p: PoolValue) {
  const { total, men, women } = splitOf(p);
  if (total < 1) return { capacity: null, male_capacity: null, female_capacity: null };
  return p.split ? { capacity: total, male_capacity: men, female_capacity: women } : { capacity: total, male_capacity: null, female_capacity: null };
}

function Stepper({ label, value, onChange, max }: { label: string; value: number; onChange: (n: number) => void; max: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-2">
      <span className="text-sm font-medium text-neutral-800">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))} aria-label={`Fewer seats for ${label}`} className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-neutral-200"><Minus className="h-4 w-4" /></button>
        <span aria-live="polite" className="w-8 text-center text-base font-semibold tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} aria-label={`More seats for ${label}`} className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg bg-neutral-950 text-white"><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

/** Guest pool: the total number of guests, and, if the host wants, how many of those seats are for men and for women. */
export function GuestPoolField({ value, onChange }: { value: PoolValue; onChange: (v: PoolValue) => void }) {
  const { total, men, women } = splitOf(value);
  return (
    <fieldset className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4">
      <legend className="px-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Guest pool</legend>
      <label className="block text-[11px] font-semibold text-neutral-500">Total guests the event takes (leave empty for no limit)
        <input value={value.total} onChange={(e) => onChange({ ...value, total: e.target.value.replace(/\D/g, '').slice(0, 5) })} inputMode="numeric" placeholder="e.g. 10"
          className="mt-1 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-[16px] focus:border-neutral-900 focus:outline-none" />
      </label>

      {total > 0 && (
        <>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-800">
            <input type="checkbox" checked={value.split} onChange={(e) => onChange({ ...value, split: e.target.checked, men: e.target.checked && !value.men ? String(Math.floor(total / 2)) : value.men })} className="h-4 w-4" />
            Set aside seats for men and women (optional)
          </label>
          {value.split && (
            <div className="space-y-2">
              <Stepper label="Men" value={men} max={total} onChange={(n) => onChange({ ...value, men: String(n) })} />
              <Stepper label="Women" value={women} max={total} onChange={(n) => onChange({ ...value, men: String(total - n) })} />
              <p className="text-[12px] font-medium text-neutral-700" aria-live="polite">{men} men + {women} women = {total} guests</p>
            </div>
          )}
          {!value.split && <p className="text-[11.5px] text-neutral-500">Open to everyone: the first {total} guests get the seats.</p>}
        </>
      )}
    </fieldset>
  );
}
