'use client';

import React from 'react';
import { HandCoins, CalendarClock, Wallet } from 'lucide-react';
import { CheckInSection } from './CheckInSection';

interface Props {
  /** The room and add-ons for the nights booked: what "pay now" takes by default. */
  stayTotal: number;
  payNow: boolean;
  setPayNow: (v: boolean) => void;
  /** What is taken now, as typed; empty means the whole stay. */
  advance: string;
  setAdvance: (v: string) => void;
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/**
 * Decided before the guest is checked in, so the desk never has to go looking for it afterwards: take the room payment
 * now (the whole stay, or an advance of any amount; the payment sheet opens the moment the guest is in) or let the whole
 * bill be paid at checkout. Either way the guest's room page shows what is paid and what is pending.
 */
export function CheckInPaymentSection({ stayTotal, payNow, setPayNow, advance, setAdvance }: Props) {
  const amount = advance.trim() === '' ? stayTotal : Math.min(stayTotal, Math.max(0, Number(advance) || 0));
  const card = (on: boolean) => `flex w-full cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition-colors ${on ? 'border-neutral-950 bg-neutral-50 ring-1 ring-neutral-950' : 'border-neutral-200 bg-white hover:border-neutral-400'}`;
  return (
    <CheckInSection icon={Wallet} title="Payment" hint={payNow ? `${inr(amount)} taken now, the rest at checkout` : 'Everything paid at checkout'}>
      <div role="radiogroup" aria-label="When the guest pays" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button type="button" role="radio" aria-checked={payNow} onClick={() => setPayNow(true)} className={card(payNow)}>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-600 text-white"><HandCoins className="h-4 w-4" aria-hidden /></span>
          <span className="min-w-0"><span className="block text-sm font-semibold text-neutral-950">Take payment now</span><span className="block text-xs text-neutral-500">Advance or the whole stay. UPI, cash or card; the payment sheet opens right after check-in.</span></span>
        </button>
        <button type="button" role="radio" aria-checked={!payNow} onClick={() => setPayNow(false)} className={card(!payNow)}>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neutral-900 text-white"><CalendarClock className="h-4 w-4" aria-hidden /></span>
          <span className="min-w-0"><span className="block text-sm font-semibold text-neutral-950">Pay at checkout</span><span className="block text-xs text-neutral-500">The stay, add-ons and room orders go on one bill, settled when the guest leaves.</span></span>
        </button>
      </div>
      {payNow && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5">
          <label htmlFor="checkin-advance" className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Amount now</label>
          <span className="font-mono text-sm text-neutral-500">₹</span>
          <input id="checkin-advance" type="number" inputMode="decimal" min={0} max={stayTotal} step="1" value={advance} placeholder={String(Math.round(stayTotal))}
            onChange={(e) => setAdvance(e.target.value)}
            className="h-9 w-32 rounded-lg border border-neutral-200 bg-white px-2.5 font-mono text-sm text-neutral-950 outline-none focus:border-neutral-900" />
          <button type="button" onClick={() => setAdvance('')} className={`cursor-pointer text-[11px] font-semibold underline-offset-2 ${advance.trim() === '' ? 'text-emerald-800' : 'text-neutral-700 underline'}`}>Whole stay · {inr(stayTotal)}</button>
          {amount < stayTotal && <span className="text-[11px] text-neutral-600">{inr(stayTotal - amount)} left for checkout</span>}
        </div>
      )}
    </CheckInSection>
  );
}
