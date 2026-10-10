'use client';

import React from 'react';
import { Check, Lock } from 'lucide-react';
import type { PlanInfo } from '@/lib/services/wallet/plans';

interface PlanCardItemProps {
  plan: PlanInfo;
  isCurrent: boolean;
  canRenew: boolean;
  highlight: boolean;
  isLocked?: boolean;
  isLoading?: boolean;
  onSelect: (plan: PlanInfo) => void;
}

export function PlanCardItem({ plan, isCurrent, canRenew, highlight, isLocked, isLoading, onSelect }: PlanCardItemProps) {
  const monthly = Math.round(plan.price / (12 + plan.bonusMonths));
  const disabled = isLoading || isLocked || (isCurrent && !canRenew);
  const label = isLocked ? 'Payment being verified' : canRenew ? 'Renew plan' : isCurrent ? 'Your plan' : 'Choose plan';

  return (
    <article className={`relative rounded-2xl border bg-white p-5 sm:p-6 flex flex-col transition-colors ${
      highlight ? 'border-neutral-900 ring-1 ring-neutral-900 shadow-sm' : 'border-neutral-200/90 hover:border-neutral-300'
    }`}>
      <span className={`absolute -top-2.5 left-5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${
        isCurrent ? 'bg-neutral-900 text-white border-neutral-900' : plan.popular ? 'bg-amber-50 text-amber-900 border-amber-300' : 'bg-white text-neutral-500 border-neutral-200'
      }`}>
        {isCurrent ? 'Current plan' : plan.badge}
      </span>

      <h4 className="mt-1 font-serif text-lg font-medium text-neutral-900">{plan.name}</h4>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold tabular-nums tracking-tight text-neutral-900">₹{plan.price.toLocaleString('en-IN')}</span>
        <span className="text-xs text-neutral-500">/ year</span>
      </div>
      <p className="mt-1 text-xs text-neutral-500">
        <strong className="text-emerald-700 font-semibold">+{plan.bonusMonths} months free</strong> · {12 + plan.bonusMonths} months in all · about ₹{monthly.toLocaleString('en-IN')}/month
      </p>

      <ul className="mt-5 space-y-2 text-xs text-neutral-600 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />{f}</li>
        ))}
      </ul>

      <button type="button" disabled={disabled} onClick={() => onSelect(plan)}
        className={`mt-6 h-10 w-full rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors disabled:cursor-not-allowed ${
          isCurrent && !canRenew ? 'bg-neutral-100 text-neutral-600'
            : isLocked ? 'bg-neutral-100 text-neutral-400'
            : highlight ? 'bg-neutral-900 text-white hover:bg-neutral-800'
            : 'border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50 hover:border-neutral-300'
        }`}>
        {isLocked && <Lock className="w-3.5 h-3.5" />}{isCurrent && !canRenew && !isLocked && <Check className="w-3.5 h-3.5 text-emerald-600" />}{label}
      </button>
    </article>
  );
}
