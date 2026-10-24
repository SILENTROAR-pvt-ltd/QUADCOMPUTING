'use client';

import React, { useState } from 'react';
import { Check, Star } from 'lucide-react';
import { PER_BILL_PLAN } from '@/lib/services/wallet/plans';
import { paidPlanRunning, type PlanState } from '@/lib/services/wallet/subscription-state';

interface Props {
  plan: PlanState;
  isLocked?: boolean;
  switching?: boolean;
  onSwitch: () => void;
}

/**
 * Pay as you go as its own plan, above the yearly ones: ₹3 a settled bill, no yearly fee, every feature. A venue on a
 * trial or in its grace week can switch to it now; a paid yearly plan moves to it by itself when it ends.
 */
export function PayAsYouGoBar({ plan, isLocked, switching, onSwitch }: Props) {
  const [confirming, setConfirming] = useState(false);
  const current = plan.phase === 'payg' || plan.phase === 'expired';
  const later = paidPlanRunning(plan);

  return (
    <article className={`overflow-hidden rounded-2xl border bg-white ${current ? 'border-neutral-900 ring-1 ring-neutral-900 shadow-sm' : 'border-neutral-200/90'}`}>
      <div className="flex items-center gap-2 bg-neutral-900 px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200">
        <Star className="h-3 w-3 fill-amber-200" aria-hidden /> {PER_BILL_PLAN.badge}
        <span className="ml-auto font-medium normal-case tracking-normal text-neutral-300">{current ? 'Your plan' : 'No yearly fee'}</span>
      </div>
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h4 className="font-serif text-lg font-medium text-neutral-900">{PER_BILL_PLAN.name}</h4>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="text-3xl font-semibold tabular-nums tracking-tight text-neutral-900">₹{PER_BILL_PLAN.perBillFee}</span>
              <span className="text-xs text-neutral-500">/ settled bill</span>
            </p>
            <p className="mt-1 text-xs font-semibold text-emerald-700">₹{PER_BILL_PLAN.setupFee} one-time setup, from your first top-up</p>
          </div>
          <div className="w-full sm:w-52">
            {current && (
              <span className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-neutral-100 text-xs font-semibold text-neutral-700">
                <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden /> You are on it
              </span>
            )}
            {later && <p className="text-xs text-neutral-500 sm:text-right">Starts by itself when your yearly plan ends.</p>}
            {!current && !later && !confirming && (
              <button type="button" disabled={isLocked || switching} onClick={() => setConfirming(true)}
                className="h-10 w-full rounded-xl border border-neutral-900 text-xs font-semibold text-neutral-900 hover:bg-neutral-50 disabled:opacity-40">
                Switch to {PER_BILL_PLAN.name}
              </button>
            )}
            {confirming && (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={switching} onClick={() => { setConfirming(false); onSwitch(); }} className="h-10 rounded-xl bg-neutral-900 text-xs font-semibold text-white disabled:opacity-40">{switching ? 'Saving…' : 'Confirm'}</button>
                <button type="button" onClick={() => setConfirming(false)} className="h-10 rounded-xl border border-neutral-200 text-xs font-semibold">Cancel</button>
              </div>
            )}
          </div>
        </div>
        <ul className="grid gap-2 border-t border-neutral-100 pt-4 text-xs text-neutral-600 sm:grid-cols-2 xl:grid-cols-3">
          {PER_BILL_PLAN.features.map((f) => (
            <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />{f}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}
