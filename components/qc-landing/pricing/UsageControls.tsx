'use client';

import React from 'react';
import { BedDouble, CalendarDays, Sparkles, Truck } from 'lucide-react';
import type { Need, PricingResult, Usage } from '@/lib/landing/pricing-math';
import { inr } from '../qc-brand';
import { RangeField } from '../RangeField';

const NEEDS: { id: Need; label: string; icon: typeof Truck }[] = [
  { id: 'events', label: 'Events & offers', icon: CalendarDays },
  { id: 'delivery', label: 'Delivery', icon: Truck },
  { id: 'rooms', label: 'Rooms & stays', icon: BedDouble },
  { id: 'vibey', label: 'Vibey AI', icon: Sparkles },
];
// Bills a day run on a log scale (5 to 300), so the small venues' end, where the plans' break-even points sit, gets room.
const BILLS = { min: 5, max: 300, steps: 1000 };
const SPAN = Math.log(BILLS.max / BILLS.min);
const toPos = (bills: number) => Math.round((BILLS.steps * Math.log(bills / BILLS.min)) / SPAN);
const fromPos = (pos: number) => Math.round(BILLS.min * Math.exp((pos / BILLS.steps) * SPAN));

/** The venue's own numbers: bills a day (with where each yearly plan starts paying for itself), days open, average bill, and needs. */
export function UsageControls({ usage, result, onChange }: { usage: Usage; result: PricingResult; onChange: (u: Usage) => void }) {
  const set = (patch: Partial<Usage>) => onChange({ ...usage, ...patch });
  const toggle = (n: Need) => set({ needs: usage.needs.includes(n) ? usage.needs.filter((x) => x !== n) : [...usage.needs, n] });
  const marks = result.quotes.filter((x) => x.eligible && x.breakEvenPerDay !== null && x.breakEvenPerDay >= BILLS.min && x.breakEvenPerDay <= BILLS.max);

  return (
    <div className="space-y-7">
      <RangeField id="calc-bills" label="Bills a day" value={toPos(usage.billsPerDay)} min={0} max={BILLS.steps} step={1} shown={String(usage.billsPerDay)}
        valueText={`${usage.billsPerDay} bills a day`} onChange={(p) => set({ billsPerDay: fromPos(p) })}>
        <div aria-hidden="true" className="relative mt-1 h-7">
          {marks.map((m) => (
            <span key={m.plan.id} className="absolute top-0 -translate-x-1/2 text-center" style={{ left: `${(toPos(m.breakEvenPerDay!) / BILLS.steps) * 100}%` }}>
              <span className="mx-auto block h-2 w-px bg-[#d9c193]/70" />
              <span className="mt-0.5 block whitespace-nowrap text-[9.5px] font-semibold text-[#d9c193]/80">{m.plan.name.replace('QC² ', '').replace(' Pro', '')}</span>
            </span>
          ))}
        </div>
        <p className="text-[11px] text-[#f6f3ec]/45">Gold marks: where a yearly plan starts costing less than ₹3 a bill.</p>
      </RangeField>
      <RangeField id="calc-days" label="Days open a month" value={usage.daysPerMonth} min={15} max={31} step={1} shown={String(usage.daysPerMonth)} onChange={(n) => set({ daysPerMonth: n })} />
      <RangeField id="calc-avg" label="Average bill" value={usage.avgBill} min={150} max={3000} step={50} shown={inr(usage.avgBill)} onChange={(n) => set({ avgBill: n })} />

      <fieldset>
        <legend className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#f6f3ec]/60">You also need</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {NEEDS.map((n) => {
            const on = usage.needs.includes(n.id);
            return (
              <button key={n.id} type="button" aria-pressed={on} onClick={() => toggle(n.id)}
                className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[12.5px] font-semibold transition-all duration-300 ${on ? 'border-[#d9c193] bg-[#d9c193] text-[#0c0f0d]' : 'border-[#f6f3ec]/20 text-[#f6f3ec]/75 hover:border-[#f6f3ec]/50'}`}>
                <n.icon aria-hidden="true" className="h-3.5 w-3.5" /> {n.label}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
