'use client';

import React, { useState } from 'react';
import { PER_BILL_PLAN, purchasablePlan } from '@/lib/services/wallet/plans';

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** One slider of the estimate. */
function Slider({ id, label, value, shown, min, max, step, onChange }: {
  id: string; label: string; value: number; shown: string; min: number; max: number; step: number; onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between gap-3 text-xs font-semibold text-neutral-800"><label htmlFor={id}>{label}</label><span className="tabular-nums">{shown}</span></div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 h-8 w-full accent-neutral-900" />
    </div>
  );
}

/**
 * Pay as you go against the yearly plans, for the venue's own numbers. Pay as you go and Rhodium yearly include the same
 * features, so that is the like-for-like verdict; M¹ and M² are shown for price, with fewer features.
 */
export function PerBillCalculator() {
  const [bills, setBills] = useState(60);
  const [days, setDays] = useState(26);
  const [months, setMonths] = useState(8);
  const yearBills = bills * days * months;
  const perBill = yearBills * PER_BILL_PLAN.perBillFee;
  const rows = [
    { name: PER_BILL_PLAN.name, cost: perBill, dark: true },
    ...(['m1_pro', 'm2_pro', 'rhodium_annual'] as const).map((id) => ({ name: purchasablePlan(id)!.name, cost: purchasablePlan(id)!.price, dark: false })),
  ];
  const top = Math.max(...rows.map((r) => r.cost), 1);
  const annual = purchasablePlan('rhodium_annual')!.price;
  const verdict = perBill <= annual
    ? `${PER_BILL_PLAN.name} keeps ${inr(annual - perBill)} in your pocket against Rhodium yearly, with every feature.`
    : `At this volume Rhodium yearly saves you ${inr(perBill - annual)} against ${PER_BILL_PLAN.name}.`;

  return (
    <section className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-xs sm:p-6">
      <h3 className="font-serif text-lg font-medium tracking-tight text-neutral-900">What would ₹{PER_BILL_PLAN.perBillFee} a bill cost you?</h3>
      <p className="text-xs text-neutral-500">₹3 a bill, whatever its size. Move the sliders to your venue.</p>
      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <Slider id="calc-bills" label="Bills a day" value={bills} shown={String(bills)} min={5} max={300} step={5} onChange={setBills} />
          <Slider id="calc-days" label="Open days a month" value={days} shown={String(days)} min={1} max={31} step={1} onChange={setDays} />
          <Slider id="calc-months" label="Busy months a year" value={months} shown={`${months} ${months === 1 ? 'month' : 'months'}`} min={1} max={12} step={1} onChange={setMonths} />
          <p className="text-[11px] text-neutral-500">About {yearBills.toLocaleString('en-IN')} bills a year. An estimate only: ₹3 is charged on each bill actually settled.</p>
        </div>
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.name}>
              <div className="flex justify-between gap-3 text-xs font-semibold text-neutral-800"><span>{r.name}</span><span className="tabular-nums">{inr(r.cost)}</span></div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-neutral-100">
                <div className={`h-full rounded-full ${r.dark ? 'bg-neutral-900' : 'bg-neutral-400'}`} style={{ width: `${(r.cost / top) * 100}%` }} />
              </div>
            </div>
          ))}
          <p role="status" className="rounded-xl bg-neutral-50 px-3.5 py-2.5 text-xs font-semibold text-neutral-900">{verdict}</p>
        </div>
      </div>
    </section>
  );
}
