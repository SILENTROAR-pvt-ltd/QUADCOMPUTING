'use client';

import React, { useEffect, useState } from 'react';
import { useCountUp } from '../useCountUp';
import { PANEL_CARD } from './VenuePanels';
import s from '@/components/vibers/luxe.module.css';

const COLUMNS = [
  { label: 'New', band: 'bg-amber-400', chip: 'border-amber-200 bg-amber-50 text-amber-900' },
  { label: 'Preparing', band: 'bg-sky-500', chip: 'border-sky-200 bg-sky-50 text-sky-900' },
  { label: 'Ready', band: 'bg-emerald-500', chip: 'border-emerald-200 bg-emerald-50 text-emerald-900' },
];

/** The kitchen board in three lanes: ticket #142 walks from new to preparing to ready while the step plays. */
export function KitchenPanel() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setStage(2); return; }
    const a = setTimeout(() => setStage(1), 1600);
    const b = setTimeout(() => setStage(2), 4200);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {COLUMNS.map((c, i) => (
        <div key={c.label} className="min-h-[15rem] rounded-2xl border border-neutral-200 bg-neutral-50/80 p-2">
          <p className="flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            {c.label}<span className="font-mono">{i === stage ? 1 : 0}</span>
          </p>
          {i === stage && (
            <article key={stage} className={`${s.rowIn} mt-2 overflow-hidden rounded-xl border border-neutral-200 bg-white`}>
              <div className={`h-1 ${c.band}`} />
              <div className="p-2.5">
                <p className="font-serif text-lg leading-none text-neutral-950">T-04</p>
                <p className="mt-1 text-[10px] text-neutral-500"><span className="font-mono font-semibold">#142</span> · <span className={`rounded-full border px-1.5 py-px font-semibold ${c.chip}`}>{c.label}</span></p>
                <ul className="mt-2 space-y-1 text-[11.5px] text-neutral-800">
                  <li className={stage > 0 ? 'text-neutral-400 line-through' : ''}><b className="font-mono">2×</b> Cappuccino</li>
                  <li className={stage > 1 ? 'text-neutral-400 line-through' : ''}><b className="font-mono">1×</b> Seafood Paella</li>
                </ul>
                <p className="mt-2 rounded-lg bg-neutral-100 py-1 text-center font-mono text-[11px] font-bold text-neutral-700">{['0m waiting', '4m cooking', 'ready 9m'][stage]}</p>
              </div>
            </article>
          )}
          {i === 1 && stage !== 1 && <p className="mt-2 rounded-xl border border-dashed border-neutral-200 p-2.5 text-[11px] text-neutral-400">T-08 · Grill · 6m</p>}
        </div>
      ))}
    </div>
  );
}

const KPIS = [
  { label: 'Sales today', value: 48260, money: true },
  { label: 'Bills settled', value: 74, money: false },
  { label: 'Average bill', value: 652, money: true },
  { label: 'Fees at ₹3 a bill', value: 222, money: true },
];
const HOURS = [12, 18, 26, 22, 15, 10, 14, 24, 38, 46, 41, 28];

function Kpi({ label, value, money }: { label: string; value: number; money: boolean }) {
  const [target, setTarget] = useState(0);
  useEffect(() => { const t = setTimeout(() => setTarget(value), 150); return () => clearTimeout(t); }, [value]);
  const shown = Math.round(useCountUp(target, 1400));
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="mt-1 font-mono text-[18px] font-semibold tabular-nums text-neutral-950">{money ? '₹' : ''}{shown.toLocaleString('en-IN')}</p>
    </div>
  );
}

/** The day's figures counting up from settled bills, with sales by hour under them. */
export function ReportPanel() {
  const peak = Math.max(...HOURS);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5">{KPIS.map((k) => <Kpi key={k.label} {...k} />)}</div>
      <div className={PANEL_CARD}>
        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Sales by hour · busiest 9 PM</p>
        <div className="mt-3 flex h-24 items-end gap-1.5" aria-hidden="true">
          {HOURS.map((h, i) => (
            <span key={i} className={`${s.rowIn} flex-1 rounded-t-[4px] ${h === peak ? 'bg-[#2a78d6]' : 'bg-[#2a78d6]/35'}`} style={{ height: `${(h / peak) * 100}%`, animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
        <p className="mt-2 flex justify-between font-mono text-[10px] text-neutral-400"><span>12 PM</span><span>11 PM</span></p>
      </div>
    </div>
  );
}
