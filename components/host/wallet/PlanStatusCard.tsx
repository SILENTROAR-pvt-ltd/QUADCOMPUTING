'use client';

import React, { useState } from 'react';
import { BadgeCheck, CalendarClock, AlertTriangle, Gauge } from 'lucide-react';
import type { PlanState } from '@/lib/services/wallet/subscription-state';
import { FeeScheduleBadges } from './FeeScheduleBadges';

interface Props {
  plan: PlanState;
  isLoading?: boolean;
  isLocked?: boolean;
  switching?: boolean;
  onRenew: () => void;
  onSwitchPayAsYouGo: () => void;
}

const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

const TONE = {
  active: { icon: BadgeCheck, chip: 'bg-emerald-50 text-emerald-800 border-emerald-200', label: 'Active' },
  expiring: { icon: CalendarClock, chip: 'bg-amber-50 text-amber-800 border-amber-200', label: 'Ending soon' },
  expired: { icon: AlertTriangle, chip: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Ended' },
  payg: { icon: Gauge, chip: 'bg-neutral-50 text-neutral-700 border-neutral-200', label: 'Pay as you go' },
} as const;

/** What the venue is on now, when it ends, and what it pays per action. */
export function PlanStatusCard({ plan, isLoading, isLocked, switching, onRenew, onSwitchPayAsYouGo }: Props) {
  const [confirming, setConfirming] = useState(false);
  const tone = TONE[plan.phase];
  const Icon = tone.icon;

  return (
    <section className="rounded-2xl border border-neutral-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-neutral-100 text-neutral-900 grid place-items-center"><Icon className="w-5 h-5" /></div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Current plan</p>
            {isLoading && plan.phase === 'payg' ? <div className="h-7 w-36 bg-neutral-100 animate-pulse rounded-lg mt-1" /> : (
              <p className="text-xl font-semibold text-neutral-900">{plan.plan ? `${plan.plan.name} annual` : 'Pay as you go'}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          {plan.phase === 'payg' && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">Most used</span>}
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${tone.chip}`}>{tone.label}</span>
        </div>
      </div>

      <p className="text-xs text-neutral-600 leading-relaxed">
        {plan.phase === 'active' && <>No platform fees until <strong className="text-neutral-900">{date(plan.endsAt)}</strong> ({plan.daysLeft} days left).</>}
        {plan.phase === 'expiring' && <>Fees are waived for {plan.daysLeft} more {plan.daysLeft === 1 ? 'day' : 'days'} (until {date(plan.endsAt)}). Renew to keep billing fee-free.</>}
        {plan.phase === 'expired' && <>Your plan ended{plan.endsAt ? ` on ${date(plan.endsAt)}` : ''}. Pay-as-you-go fees apply from your credit until you renew.</>}
        {plan.phase === 'payg' && <>You pay ₹3 for each settled bill, from your credit wallet. Nothing else is charged. An annual plan removes this fee.</>}
      </p>

      <FeeScheduleBadges feesWaived={plan.feesWaived} />

      {(plan.phase === 'expiring' || plan.phase === 'expired') && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button type="button" disabled={isLocked} onClick={onRenew} className="h-9 px-4 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 disabled:opacity-40">Renew {plan.plan?.name}</button>
          {plan.phase === 'expired' && !confirming && (
            <button type="button" disabled={isLocked || switching} onClick={() => setConfirming(true)} className="h-9 px-4 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40">Stay on pay as you go</button>
          )}
          {confirming && (
            <span className="inline-flex items-center gap-2 text-xs text-neutral-600">
              Move to pay as you go?
              <button type="button" disabled={switching} onClick={() => { setConfirming(false); onSwitchPayAsYouGo(); }} className="h-8 px-3 rounded-lg bg-neutral-900 text-white font-semibold disabled:opacity-40">{switching ? 'Saving…' : 'Confirm'}</button>
              <button type="button" onClick={() => setConfirming(false)} className="h-8 px-3 rounded-lg border border-neutral-200 font-semibold">Cancel</button>
            </span>
          )}
        </div>
      )}
    </section>
  );
}
