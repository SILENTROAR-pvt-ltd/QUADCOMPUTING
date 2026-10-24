'use client';

import React, { useState } from 'react';
import { BadgeCheck, CalendarClock, AlertTriangle, Gauge, Gift } from 'lucide-react';
import type { PlanState } from '@/lib/services/wallet/subscription-state';
import { PER_BILL_PLAN } from '@/lib/services/wallet/plans';
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
const days = (n: number | null) => `${n} ${n === 1 ? 'day' : 'days'}`;

const TONE = {
  trial: { icon: Gift, chip: 'bg-sky-50 text-sky-800 border-sky-200', label: 'Free trial' },
  active: { icon: BadgeCheck, chip: 'bg-emerald-50 text-emerald-800 border-emerald-200', label: 'Active' },
  expiring: { icon: CalendarClock, chip: 'bg-amber-50 text-amber-800 border-amber-200', label: 'Ending soon' },
  grace: { icon: AlertTriangle, chip: 'bg-amber-50 text-amber-900 border-amber-300', label: 'Grace week' },
  expired: { icon: AlertTriangle, chip: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Ended' },
  payg: { icon: Gauge, chip: 'bg-neutral-50 text-neutral-700 border-neutral-200', label: '₹3 a bill' },
} as const;

/** What the venue is on now, when it ends, and what it pays per bill. */
export function PlanStatusCard({ plan, isLoading, isLocked, switching, onRenew, onSwitchPayAsYouGo }: Props) {
  const [confirming, setConfirming] = useState(false);
  const tone = TONE[plan.onTrial ? 'trial' : plan.phase];
  const Icon = tone.icon;
  const name = plan.phase === 'payg' || plan.phase === 'expired' ? PER_BILL_PLAN.name : plan.plan?.name;
  const canBuy = plan.onTrial || plan.phase === 'expiring' || plan.phase === 'grace' || plan.phase === 'expired';
  const canLeave = plan.onTrial || plan.phase === 'grace' || plan.phase === 'expired';

  return (
    <section className="rounded-2xl border border-neutral-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-neutral-100 text-neutral-900 grid place-items-center"><Icon className="w-5 h-5" /></div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Current plan</p>
            {isLoading && plan.phase === 'payg' ? <div className="h-7 w-36 bg-neutral-100 animate-pulse rounded-lg mt-1" /> : (
              <p className="text-xl font-semibold text-neutral-900">{name}</p>
            )}
          </div>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${tone.chip}`}>{tone.label}</span>
      </div>

      <p className="text-xs text-neutral-600 leading-relaxed">
        {plan.onTrial && <>Your free month of {plan.plan?.name} runs until <strong className="text-neutral-900">{date(plan.endsAt)}</strong> ({days(plan.daysLeft)} left), with no bill fee. Buy the plan to keep it after that; otherwise you move to {PER_BILL_PLAN.name} at ₹3 a bill.</>}
        {!plan.onTrial && plan.phase === 'active' && <>No per-bill fee until <strong className="text-neutral-900">{date(plan.endsAt)}</strong> ({days(plan.daysLeft)} left).</>}
        {!plan.onTrial && plan.phase === 'expiring' && <>Your plan ends on {date(plan.endsAt)} ({days(plan.daysLeft)} left). Renew to keep billing fee-free.</>}
        {plan.phase === 'grace' && <>Your plan ended on {date(plan.endsAt)}. Everything keeps working, with no bill fee, for <strong className="text-neutral-900">{days(plan.daysLeft)}</strong> more while you renew; after that you move to {PER_BILL_PLAN.name} at ₹3 a bill.</>}
        {plan.phase === 'expired' && <>Your {plan.plan?.name} plan ended{plan.endsAt ? ` on ${date(plan.endsAt)}` : ''}. You are on {PER_BILL_PLAN.name}, ₹3 a bill, until you buy a plan.</>}
        {plan.phase === 'payg' && <>₹3 for each settled bill, from your credit wallet, whatever the bill size. No bills, no charge. Every feature is included. A yearly plan removes the fee.</>}
      </p>

      <FeeScheduleBadges feesWaived={plan.feesWaived} />

      {canBuy && plan.plan && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button type="button" disabled={isLocked} onClick={onRenew} className="h-9 px-4 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 disabled:opacity-40">
            {plan.onTrial ? `Buy ${plan.plan.name}` : `Renew ${plan.plan.name}`}
          </button>
          {canLeave && !confirming && (
            <button type="button" disabled={isLocked || switching} onClick={() => setConfirming(true)} className="h-9 px-4 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40">
              {plan.onTrial ? `End trial, move to ${PER_BILL_PLAN.name}` : `Switch to ${PER_BILL_PLAN.name}`}
            </button>
          )}
          {confirming && (
            <span className="inline-flex items-center gap-2 text-xs text-neutral-600">
              {plan.onTrial ? 'End your free month now?' : `Switch to ${PER_BILL_PLAN.name} now?`}
              <button type="button" disabled={switching} onClick={() => { setConfirming(false); onSwitchPayAsYouGo(); }} className="h-8 px-3 rounded-lg bg-neutral-900 text-white font-semibold disabled:opacity-40">{switching ? 'Saving…' : 'Confirm'}</button>
              <button type="button" onClick={() => setConfirming(false)} className="h-8 px-3 rounded-lg border border-neutral-200 font-semibold">Cancel</button>
            </span>
          )}
        </div>
      )}
    </section>
  );
}
