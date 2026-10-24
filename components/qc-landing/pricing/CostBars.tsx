'use client';

import React from 'react';
import { billsPerYear, type Need, type PlanQuote, type PricingResult, type Usage } from '@/lib/landing/pricing-math';
import { inr } from '../qc-brand';
import { useCountUp } from '../useCountUp';
import q from '../qc.module.css';

const NEED_WORD: Record<Need, string> = { events: 'events', delivery: 'delivery', rooms: 'rooms', vibey: 'Vibey' };

function Row({ x, best, max, usage }: { x: PlanQuote; best: boolean; max: number; usage: Usage }) {
  const shown = useCountUp(x.yearly);
  const width = max > 0 ? Math.max(2, (x.yearly / max) * 100) : 2;
  const perBill = x.plan.perBillFee > 0;
  const how = perBill ? `₹${x.plan.perBillFee} × ${billsPerYear(usage).toLocaleString('en-IN')} bills` : x.addon ? `plan + Vibey add-on ${inr(x.addon)}` : 'one flat fee';
  return (
    <li className={`grid grid-cols-[7.5rem_1fr] items-center gap-3 sm:grid-cols-[9rem_1fr] ${x.eligible ? '' : 'opacity-60'}`}>
      <span className="min-w-0">
        <span className={`block truncate text-[13px] font-semibold ${best ? 'text-[#d9c193]' : 'text-[#f6f3ec]'}`}>{x.plan.name.replace('QC² ', '')}</span>
        <span className="block truncate text-[10.5px] text-[#f6f3ec]/45">{x.eligible ? how : `No ${x.missing.map((m) => NEED_WORD[m]).join(' or ')}`}</span>
      </span>
      <span className="relative h-9 overflow-hidden rounded-[6px] bg-[#f6f3ec]/[0.05]">
        <span className={`${q.bar} absolute inset-y-0 left-0 rounded-[6px] ${x.eligible ? (best ? 'bg-[#d9c193]' : 'bg-[#f6f3ec]/25') : q.hatch}`} style={{ width: `${width}%` }} />
        <span className={`absolute inset-y-0 flex items-center px-3 font-mono text-[12.5px] font-semibold tabular-nums ${width > 55 ? `left-0 ${best ? 'text-[#0c0f0d]' : 'text-[#f6f3ec]'}` : 'text-[#f6f3ec]'}`}
          style={width > 55 ? undefined : { left: `${width}%` }}>
          {x.eligible ? `${inr(shown)} a year` : 'Not on this plan'}
        </span>
      </span>
    </li>
  );
}

/** What a year costs on each plan at the venue's volume: one bar each, the best one in gold, plans that cannot cover the needs hatched. */
export function CostBars({ result, usage }: { result: PricingResult; usage: Usage }) {
  const max = Math.max(...result.quotes.map((x) => x.yearly));
  return (
    <figure>
      <figcaption className="mb-4 flex items-baseline justify-between gap-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#f6f3ec]/60">
        A year on each plan <span className="normal-case tracking-normal text-[#f6f3ec]/40">₹599 setup once on every plan</span>
      </figcaption>
      <ul className="space-y-2.5">
        {result.quotes.map((x) => <Row key={x.plan.id} x={x} best={x === result.best} max={max} usage={usage} />)}
      </ul>
    </figure>
  );
}
