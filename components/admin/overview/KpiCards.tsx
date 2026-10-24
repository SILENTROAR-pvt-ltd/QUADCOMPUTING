import React from 'react';
import { inr } from '../ui/format';
import type { PeriodTotals } from './types';

interface Kpi { label: string; tint: string; value: string; cur: number; prev: number; delta: string; deltaIsMoney?: boolean }

/** The change against the period before, as a pill: ▲ green, ▼ red, "New" when there was nothing to compare with. */
function Change({ cur, prev, text }: { cur: number; prev: number; text: string }) {
  if (prev <= 0) return <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-neutral-600">{cur > 0 ? 'New' : '—'}</span>;
  const pct = Math.round(((cur - prev) / prev) * 1000) / 10;
  const up = pct >= 0;
  return (
    <span className="flex w-full items-center justify-between gap-2 text-[11px]">
      <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 font-semibold ${up ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{up ? '▲' : '▼'} {Math.abs(pct)}%</span>
      <span className="truncate text-neutral-500">({text})</span>
    </span>
  );
}

const signed = (n: number, money: boolean) => `${n >= 0 ? '+' : '−'}${money ? inr(Math.abs(n)) : Math.abs(n).toLocaleString('en-IN')}`;

/** Five headline figures for the period, each tinted, with its change against the period before. */
export function KpiCards({ cur, prev }: { cur: PeriodTotals; prev: PeriodTotals }) {
  const kpis: Kpi[] = [
    { label: 'Platform GMV', tint: 'bg-[#fdf1e7]', value: inr(cur.gmv), cur: cur.gmv, prev: prev.gmv, delta: signed(cur.gmv - prev.gmv, true) },
    { label: 'Bills settled', tint: 'bg-[#eaf6ef]', value: cur.orders.toLocaleString('en-IN'), cur: cur.orders, prev: prev.orders, delta: signed(cur.orders - prev.orders, false) },
    { label: 'Active venues', tint: 'bg-[#ecf2fd]', value: cur.venues.toLocaleString('en-IN'), cur: cur.venues, prev: prev.venues, delta: signed(cur.venues - prev.venues, false) },
    { label: 'Average bill', tint: 'bg-[#eef5e7]', value: inr(cur.avgBill, 2), cur: cur.avgBill, prev: prev.avgBill, delta: signed(Math.round(cur.avgBill - prev.avgBill), true) },
    { label: 'Platform income', tint: 'bg-[#fcedef]', value: inr(cur.income.total), cur: cur.income.total, prev: prev.income.total, delta: signed(cur.income.total - prev.income.total, true) },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {kpis.map((k) => (
        <div key={k.label} className={`rounded-2xl p-4 ${k.tint}`}>
          <p className="text-[12px] font-medium text-neutral-600">{k.label}</p>
          <p className="mt-2 truncate text-[22px] font-semibold tracking-tight text-neutral-950">{k.value}</p>
          <div className="mt-3"><Change cur={k.cur} prev={k.prev} text={k.delta} /></div>
        </div>
      ))}
    </div>
  );
}
