'use client';

import React from 'react';
import { BellRing, CheckCircle2, ReceiptText } from 'lucide-react';
import { useCountUp } from '../useCountUp';
import { PLAY_MENU, billOf, type PlayAction, type PlayState, type Stage } from './play-state';
import s from '@/components/vibers/luxe.module.css';

const LANES: { stage: Stage; label: string; band: string }[] = [
  { stage: 'new', label: 'New', band: 'bg-amber-400' },
  { stage: 'preparing', label: 'Preparing', band: 'bg-sky-500' },
  { stage: 'ready', label: 'Ready', band: 'bg-emerald-500' },
];
const PULSE = 'ring-4 ring-[#d9c193]/70 animate-pulse';

function Kpi({ label, value, money }: { label: string; value: number; money?: boolean }) {
  const v = useCountUp(value, 900);
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5">
      <p className="text-[9.5px] font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="mt-0.5 font-mono text-[16px] font-semibold tabular-nums text-neutral-950">{money ? '₹' : ''}{(money ? Math.round(v * 100) / 100 : Math.round(v)).toLocaleString('en-IN')}</p>
    </div>
  );
}

/** The venue's screen in the playable table: the day so far, the kitchen lanes with the live ticket, and the counter. */
export function PlayVenue({ state, dispatch, turn }: { state: PlayState; dispatch: (a: PlayAction) => void; turn: boolean }) {
  const bill = billOf(state.cart);
  const lines = PLAY_MENU.filter((d) => state.cart[d.id]);
  const step = (label: string, a: PlayAction, cls: string) => (
    <button type="button" onClick={() => dispatch(a)} className={`mt-2 h-9 w-full rounded-lg text-[12px] font-semibold text-white transition-transform active:scale-95 ${cls} ${turn ? PULSE : ''}`}>{label}</button>
  );

  return (
    <div className="space-y-3 rounded-[20px] bg-[#f4f3ee] p-3 sm:p-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi label="Sales today" value={state.day.sales} money />
        <Kpi label="Bills settled" value={state.day.bills} />
        <Kpi label="7% to guests" value={state.day.cashback} money />
        <Kpi label="Fees at ₹3" value={state.day.fees} money />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {LANES.map((l) => (
          <div key={l.stage} className="min-h-[11.5rem] rounded-xl border border-neutral-200 bg-neutral-50/80 p-2">
            <p className="px-0.5 text-[9.5px] font-bold uppercase tracking-wider text-neutral-500">{l.label}</p>
            {state.stage === l.stage && (
              <article key={l.stage} className={`${s.rowIn} mt-1.5 overflow-hidden rounded-lg border border-neutral-200 bg-white`}>
                <div className={`h-1 ${l.band}`} />
                <div className="p-2">
                  <p className="flex items-center justify-between font-serif text-[15px] leading-none text-neutral-950">T-0{state.table}{l.stage === 'new' && <BellRing className="h-3.5 w-3.5 animate-bounce text-amber-500" aria-label="New order" />}</p>
                  <p className="mt-0.5 font-mono text-[9.5px] text-neutral-500">#{state.ticket}</p>
                  <ul className="mt-1.5 space-y-0.5 text-[10.5px] text-neutral-800">{lines.map((d) => <li key={d.id} className={l.stage === 'ready' ? 'text-neutral-400 line-through' : ''}><b className="font-mono">{state.cart[d.id]}×</b> {d.name}</li>)}</ul>
                  {l.stage === 'new' && step('Start preparing', { type: 'prepare' }, 'bg-neutral-950')}
                  {l.stage === 'preparing' && step('Mark ready', { type: 'ready' }, 'bg-emerald-600')}
                </div>
              </article>
            )}
            {state.stage === 'ordering' && l.stage === 'new' && <p className="mt-2 text-[10.5px] leading-snug text-neutral-400">Waiting for T-0{state.table} to send an order…</p>}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5">
        <p className="flex items-center gap-2 text-[12px] text-neutral-700">
          <ReceiptText aria-hidden="true" className="h-4 w-4 text-neutral-400" />
          {state.stage === 'ordering' ? 'Counter: nothing to settle yet' : <>T-0{state.table} · <b className="font-mono text-neutral-950">₹{bill.total.toFixed(2)}</b> incl. 5% GST</>}
        </p>
        {state.stage === 'ready' && <button type="button" onClick={() => dispatch({ type: 'settle' })} className={`h-9 rounded-lg bg-neutral-950 px-4 text-[12px] font-semibold text-white ${PULSE}`}>Settle · UPI</button>}
        {state.stage === 'settled' && (
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[12px] font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Settled</span>
            <button type="button" onClick={() => dispatch({ type: 'next' })} className={`h-9 rounded-lg bg-neutral-950 px-4 text-[12px] font-semibold text-white ${PULSE}`}>Seat next table</button>
          </span>
        )}
      </div>
    </div>
  );
}
