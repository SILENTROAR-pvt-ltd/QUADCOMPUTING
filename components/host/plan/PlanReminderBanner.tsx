'use client';

import React, { useState } from 'react';
import { CalendarClock, X } from 'lucide-react';
import { requestOpenTab } from '@/lib/host/open-tab-request';
import { PER_BILL_PLAN } from '@/lib/services/wallet/plans';
import { usePlanFeatures, type HostPlan } from './usePlanFeatures';

const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '');
const days = (n: number | null) => `${n} ${n === 1 ? 'day' : 'days'}`;
const FALLBACK = `${PER_BILL_PLAN.name} (₹${PER_BILL_PLAN.perBillFee} a bill)`;

/** The reminder for this plan right now, or null: a trial in its last 5 days, a plan in its last 15, the grace week. */
export function planReminder(p: HostPlan | null): { text: string; urgent: boolean } | null {
  if (!p) return null;
  if (p.phase === 'grace') {
    return { urgent: true, text: `Your ${p.planName} plan ended on ${date(p.endsAt)}. It keeps working for ${days(p.daysLeft)} more; renew to keep it, or you move to ${FALLBACK}.` };
  }
  if (p.onTrial && p.daysLeft !== null && p.daysLeft <= 5) {
    return { urgent: p.daysLeft <= 1, text: `Your free month of ${p.planName} ends in ${days(p.daysLeft)}. Buy it to keep it; otherwise you move to ${FALLBACK}.` };
  }
  if (!p.onTrial && p.phase === 'expiring') {
    return { urgent: (p.daysLeft ?? 0) <= 1, text: `Your ${p.planName} plan ends on ${date(p.endsAt)} (${days(p.daysLeft)} left). Renew to keep billing fee-free.` };
  }
  return null;
}

/** Above every section except Wallet: the plan reminder, which the host can put away for this visit. */
export function PlanReminderBanner({ venueId }: { venueId: string }) {
  const { plan } = usePlanFeatures(venueId);
  const [hidden, setHidden] = useState(false);
  const reminder = planReminder(plan);
  if (!reminder || hidden) return null;
  return (
    <div role="status" className={`relative mb-5 flex flex-col gap-3 rounded-2xl border py-3 pl-4 pr-11 sm:flex-row sm:items-center ${reminder.urgent ? 'border-amber-300 bg-amber-50' : 'border-neutral-200 bg-white'}`}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <CalendarClock className={`mt-0.5 h-5 w-5 shrink-0 ${reminder.urgent ? 'text-amber-700' : 'text-neutral-500'}`} aria-hidden />
        <p className="text-xs sm:text-sm leading-relaxed text-neutral-800">{reminder.text}</p>
      </div>
      <button type="button" onClick={() => requestOpenTab('wallet')} className="ml-8 h-9 shrink-0 self-start rounded-xl bg-neutral-900 px-4 text-xs font-semibold text-white hover:bg-black sm:ml-0 sm:self-auto">Open Wallet</button>
      <button type="button" onClick={() => setHidden(true)} aria-label="Hide reminder" className="absolute right-2 top-2.5 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800"><X className="h-4 w-4" /></button>
    </div>
  );
}
