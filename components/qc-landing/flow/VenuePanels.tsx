'use client';

import React from 'react';
import { BellRing, CheckCircle2, Smartphone, Wallet } from 'lucide-react';
import s from '@/components/vibers/luxe.module.css';

// What the venue's screen shows at each step of the order story. Drawn in the control centre's own look (white cards,
// mono numbers, the kitchen's colour bands), with the sample café's table T-04.

const TABLES = ['T-01', 'T-02', 'T-03', 'T-04', 'T-05', 'T-06', 'T-07', 'T-08'];
const BUSY = new Set(['T-02', 'T-07']);
export const PANEL_CARD = 'rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]';

export function ConnectedPanel() {
  return (
    <div className={PANEL_CARD}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Live tables · Ground floor</p>
      <ul className="mt-3 grid grid-cols-4 gap-2">
        {TABLES.map((t, i) => {
          const live = t === 'T-04';
          return (
            <li key={t} style={{ ['--i' as string]: i } as React.CSSProperties}
              className={`relative rounded-xl border p-2.5 text-[12px] font-semibold ${live ? `${s.chipIn} border-emerald-300 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200` : BUSY.has(t) ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-neutral-200 bg-neutral-50 text-neutral-500'}`}>
              {t}
              <span className="mt-1 block text-[10px] font-medium opacity-75">{live ? 'Aanya · just in' : BUSY.has(t) ? 'Ordering' : 'Vacant'}</span>
              {live && <span aria-hidden="true" className={`${s.pulse} absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-emerald-500`} />}
            </li>
          );
        })}
      </ul>
      <p className={`${s.rowIn} mt-4 flex items-center gap-2 rounded-xl bg-neutral-950 px-3 py-2.5 text-[12px] text-white`}>
        <Smartphone aria-hidden="true" className="h-4 w-4 text-[#d9c193]" /> T-04 scanned the QR · menu open on the guest’s phone
      </p>
    </div>
  );
}

const KOT_LINES = [
  { qty: 2, name: 'Cappuccino', note: '' },
  { qty: 1, name: 'Seafood Paella', note: 'Less spicy' },
];

export function KotPanel() {
  return (
    <div className="space-y-3">
      <p className={`${s.chipIn} flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-900`}>
        <BellRing aria-hidden="true" className="h-4 w-4 animate-pulse" /> New order · T-04 · sent from the guest’s phone
      </p>
      <article className={`${s.rowIn} overflow-hidden rounded-2xl border border-neutral-200 bg-white`}>
        <div className="h-1.5 bg-amber-400" />
        <div className="flex items-start justify-between px-4 pt-3">
          <div>
            <p className="font-serif text-2xl leading-none text-neutral-950">T-04</p>
            <p className="mt-1.5 text-[11px] text-neutral-500"><span className="font-mono font-semibold text-neutral-700">#142</span> · Kitchen · <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-semibold text-amber-900">New</span></p>
          </div>
          <p className="rounded-xl bg-neutral-100 px-2.5 py-1.5 text-center font-mono text-lg font-bold leading-none text-neutral-700">0m</p>
        </div>
        <ul className="mt-3 divide-y divide-neutral-100 border-t border-neutral-100">
          {KOT_LINES.map((l, i) => (
            <li key={l.name} className={`${s.rowIn} px-4 py-2 text-[13.5px] font-medium text-neutral-950`} style={{ animationDelay: `${0.25 + i * 0.2}s` }}>
              <span className="mr-1.5 font-mono font-bold">{l.qty}×</span>{l.name}
              {l.note && <span className="block text-[11px] font-normal text-amber-800">{l.note}</span>}
            </li>
          ))}
        </ul>
        <p className="m-4 flex h-11 items-center justify-center rounded-xl bg-neutral-950 text-[13px] font-semibold text-white">Start preparing</p>
      </article>
    </div>
  );
}

const BILL = [['2× Cappuccino', 360], ['1× Seafood Paella', 540]] as const;

export function SettlePanel() {
  return (
    <div className={PANEL_CARD}>
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">Digital receipt</p>
        <span className={`${s.chipIn} rounded-full border border-sky-300 bg-sky-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-950`}>Bill requested</span>
      </div>
      <ul className="mt-3 space-y-1.5 text-[12.5px] text-neutral-700">
        {BILL.map(([n, v]) => <li key={n} className="flex justify-between"><span>{n}</span><span className="font-mono">{v.toFixed(2)}</span></li>)}
        <li className="flex justify-between text-neutral-500"><span>GST (5%)</span><span className="font-mono">45.00</span></li>
      </ul>
      <p className="mt-3 flex justify-between border-t border-neutral-200 pt-3 font-serif text-2xl text-neutral-950"><span>Total</span><span className="font-mono font-semibold">₹945.00</span></p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold">
        {['Cash', 'UPI', 'Card'].map((m) => <span key={m} className={`rounded-lg border py-2 ${m === 'UPI' ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-200 text-neutral-600'}`}>{m}</span>)}
      </div>
      <p className={`${s.rowIn} mt-3 flex items-center justify-between rounded-xl border border-emerald-500/25 bg-emerald-50/70 px-3 py-2 text-[12px] text-emerald-900`} style={{ animationDelay: '0.6s' }}>
        <span className="flex items-center gap-2"><Wallet aria-hidden="true" className="h-4 w-4" /> 7% cashback to @aanya</span><b className="font-mono">₹66.15</b>
      </p>
      <p className={`${s.rowIn} mt-2 flex items-center gap-2 text-[12px] font-semibold text-emerald-700`} style={{ animationDelay: '1.1s' }}>
        <CheckCircle2 aria-hidden="true" className="h-4 w-4" /> Settled · UPI · table T-04 is free again
      </p>
    </div>
  );
}
