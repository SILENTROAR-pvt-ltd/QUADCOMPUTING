'use client';

import React, { useMemo, useState } from 'react';
import { growthFor, type GrowthInput } from '@/lib/landing/growth-math';
import { DISPLAY } from '@/components/vibers/vibers-fonts';
import { inr } from '../qc-brand';
import { RangeField } from '../RangeField';
import { useCountUp } from '../useCountUp';
import q from '../qc.module.css';

// A modest month for a café that tries all three: where the sliders start, never a claim about other venues.
const START: GrowthInput = { eventNights: 2, guestsPerEvent: 40, spendPerGuest: 650, redemptionsPerWeek: 15, offerBill: 900, servicesPerWeek: 6, servicePrice: 700 };

const GROUPS: { id: 'events' | 'offers' | 'services'; label: string; color: string; fields: { key: keyof GrowthInput; label: string; min: number; max: number; step: number; money?: boolean }[] }[] = [
  { id: 'events', label: 'Events', color: '#d9c193', fields: [
    { key: 'eventNights', label: 'Event nights a month', min: 0, max: 12, step: 1 },
    { key: 'guestsPerEvent', label: 'Guests a night', min: 10, max: 200, step: 5 },
    { key: 'spendPerGuest', label: 'Spend a guest', min: 200, max: 3000, step: 50, money: true },
  ] },
  { id: 'offers', label: 'Offers', color: '#f6f3ec', fields: [
    { key: 'redemptionsPerWeek', label: 'Offers redeemed a week', min: 0, max: 150, step: 1 },
    { key: 'offerBill', label: 'Bill with an offer', min: 200, max: 4000, step: 50, money: true },
  ] },
  { id: 'services', label: 'Services', color: '#7fb79a', fields: [
    { key: 'servicesPerWeek', label: 'Services booked a week', min: 0, max: 80, step: 1 },
    { key: 'servicePrice', label: 'Price a service', min: 100, max: 5000, step: 50, money: true },
  ] },
];

/** What events, offers and booked services add to a month, on the venue's own numbers, with the fee shown openly. */
export function LiftSimulator() {
  const [g, setG] = useState<GrowthInput>(START);
  const r = useMemo(() => growthFor(g), [g]);
  const total = useCountUp(r.total);
  const yearly = useCountUp(r.yearly);
  const parts = GROUPS.map((x) => ({ ...x, value: r[x.id] }));

  return (
    <div className="grid gap-10 rounded-[28px] bg-[#0c0f0d] p-6 text-[#f6f3ec] sm:p-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
      <div className="space-y-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#d9c193]">Your numbers, your month</p>
        {GROUPS.map((grp) => (
          <fieldset key={grp.id} className="space-y-4 border-t border-white/10 pt-5 first-of-type:border-0 first-of-type:pt-0">
            <legend className="mb-1 flex items-center gap-2 text-[13px] font-semibold"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: grp.color }} />{grp.label}</legend>
            {grp.fields.map((f) => (
              <RangeField key={f.key} id={`lift-${f.key}`} label={f.label} min={f.min} max={f.max} step={f.step} value={g[f.key]}
                shown={f.money ? inr(g[f.key]) : String(g[f.key])} onChange={(n) => setG((p) => ({ ...p, [f.key]: n }))} />
            ))}
          </fieldset>
        ))}
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f6f3ec]/55">Extra sales a month</p>
        <p className={`${DISPLAY} mt-2 text-[3.4rem] font-light leading-none tabular-nums text-[#d9c193] sm:text-[4.2rem]`}>{inr(total)}</p>
        <p className="mt-2 text-[14px] text-[#f6f3ec]/65">{inr(yearly)} a year, from guests a till alone never sees.</p>

        <div className="mt-7 flex h-4 w-full gap-[2px] overflow-hidden rounded-full bg-white/[0.06]" role="img" aria-label={parts.map((p) => `${p.label} ${inr(p.value)}`).join(', ')}>
          {parts.map((p) => r.total > 0 && p.value > 0 && <span key={p.id} className={`${q.bar} h-full first:rounded-l-full last:rounded-r-full`} style={{ width: `${(p.value / r.total) * 100}%`, background: p.color }} />)}
        </div>
        <ul className="mt-4 space-y-2">
          {parts.map((p) => (
            <li key={p.id} className="flex items-center justify-between text-[13.5px]">
              <span className="flex items-center gap-2 text-[#f6f3ec]/75"><span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: p.color }} />{p.label}</span>
              <span className="font-mono font-semibold tabular-nums">{inr(p.value)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-7 space-y-3 border-t border-white/10 pt-5 text-[13.5px] leading-relaxed text-[#f6f3ec]/70">
          {g.eventNights > 0 && <p>One event night here is worth about <b className="text-[#f6f3ec]">{inr(r.perEventNight)}</b>. Every quiet night without one leaves that on the table.</p>}
          <p>That is about <b className="text-[#f6f3ec]">{r.bills.toLocaleString('en-IN')}</b> new bills. On ₹3 a bill we would earn <b className="text-[#f6f3ec]">{inr(r.fees)}</b> of it; on a yearly plan, nothing. You keep the rest.</p>
          <p className="text-[11.5px] text-[#f6f3ec]/40">Your own figures, not a forecast. Event guests are counted one bill per party of three; booked services go on bills already open.</p>
        </div>
      </div>
    </div>
  );
}
