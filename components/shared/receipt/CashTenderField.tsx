'use client';

import React from 'react';
import { cashSuggestions } from '@/lib/services/billing/cash-tender';

interface Props {
  /** What this bill takes now. */
  due: number;
  /** Cash handed over, or null while nothing has been entered (exact cash is assumed). */
  tendered: number | null;
  disabled: boolean;
  onChange: (n: number | null) => void;
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/**
 * Cash at the till: the notes the guest hands over and the change to give back, worked out on the spot and kept with
 * the bill, so the drawer reconciles at the end of the day. Left blank, the exact amount is taken.
 */
export function CashTenderField({ due, tendered, disabled, onChange }: Props) {
  const given = tendered ?? 0;
  const short = tendered !== null && given + 0.005 < due;
  const change = tendered !== null && !short ? Math.round((given - due) * 100) / 100 : 0;
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
      <div className="flex items-center gap-2">
        <label htmlFor="cash-given" className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-neutral-500">Cash given</label>
        <span className="font-mono text-sm text-neutral-500">₹</span>
        <input id="cash-given" type="number" inputMode="decimal" min={0} step="1" value={tendered ?? ''} disabled={disabled} placeholder={String(Math.ceil(due))}
          onChange={(e) => onChange(e.target.value === '' ? null : Math.max(0, Number(e.target.value) || 0))}
          className={`h-10 min-w-0 flex-1 rounded-xl border bg-white px-3 font-mono text-[15px] text-neutral-950 outline-none focus:border-neutral-900 ${short ? 'border-rose-300' : 'border-neutral-200'}`} />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {cashSuggestions(due).map((n) => (
          <button key={n} type="button" disabled={disabled} onClick={() => onChange(n)}
            className={`h-8 cursor-pointer rounded-full border px-3 text-[12px] font-semibold ${tendered === n ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400'}`}>
            {inr(n)}
          </button>
        ))}
      </div>
      <p className={`mt-2 flex items-baseline justify-between text-[13px] ${short ? 'text-rose-700' : 'text-neutral-800'}`} aria-live="polite">
        <span className="font-semibold">{short ? 'Short of the bill' : tendered === null ? 'Exact amount' : change > 0 ? 'Return change' : 'No change'}</span>
        <span className="font-mono text-base font-bold">{short ? `− ${inr(due - given)}` : inr(change)}</span>
      </p>
    </div>
  );
}
