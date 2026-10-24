'use client';

import React from 'react';
import { Check, Gift, Lock } from 'lucide-react';
import type { PlanInfo } from '@/lib/services/wallet/plans';

/** What the card's main button does for this venue right now. */
export type CardMode = 'buy' | 'upgrade' | 'renew' | 'current' | 'trialing' | 'later';

interface PlanCardItemProps {
  plan: PlanInfo;
  mode: CardMode;
  highlight: boolean;
  /** Offer the free month on this card. */
  canTrial?: boolean;
  isLocked?: boolean;
  isLoading?: boolean;
  starting?: boolean;
  onSelect: (plan: PlanInfo) => void;
  onTrial: (plan: PlanInfo) => void;
}

const LABEL: Record<CardMode, string> = {
  buy: 'Choose plan', upgrade: 'Upgrade', renew: 'Renew plan', current: 'Your plan', trialing: 'Buy now', later: 'From your renewal',
};

export function PlanCardItem({ plan, mode, highlight, canTrial, isLocked, isLoading, starting, onSelect, onTrial }: PlanCardItemProps) {
  const monthly = Math.round(plan.price / plan.termMonths);
  const terms = [plan.trialDays ? `${Math.round(plan.trialDays / 30)}-month free trial` : '', plan.setupFee ? `₹${plan.setupFee} one-time setup` : '']
    .filter(Boolean).join(' · ');
  const still = mode === 'current' || mode === 'later';
  const disabled = isLoading || isLocked || still;
  const badge = mode === 'trialing' ? 'On free trial' : mode === 'current' || mode === 'renew' ? 'Current plan' : plan.badge;

  return (
    <article className={`relative rounded-2xl border bg-white p-5 sm:p-6 flex flex-col transition-colors ${
      highlight ? 'border-neutral-900 ring-1 ring-neutral-900 shadow-sm' : 'border-neutral-200/90 hover:border-neutral-300'
    }`}>
      <span className={`absolute -top-2.5 left-5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${
        badge !== plan.badge ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-500 border-neutral-200'
      }`}>
        {badge}
      </span>

      <h4 className="mt-1 font-serif text-lg font-medium text-neutral-900">{plan.name}</h4>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold tabular-nums tracking-tight text-neutral-900">₹{plan.price.toLocaleString('en-IN')}</span>
        <span className="text-xs text-neutral-500">/ year</span>
      </div>
      <p className="mt-1 text-xs text-neutral-500">
        {terms && <><strong className="text-emerald-700 font-semibold">{terms}</strong> · </>}about ₹{monthly.toLocaleString('en-IN')}/month
      </p>

      <ul className="mt-5 space-y-2 text-xs text-neutral-600 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />{f}</li>
        ))}
      </ul>

      <div className="mt-6 grid gap-2">
        {canTrial && (
          <button type="button" disabled={isLoading || isLocked || starting} onClick={() => onTrial(plan)}
            className="h-10 w-full rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50">
            <Gift className="w-3.5 h-3.5" />{starting ? 'Starting…' : 'Try free for a month'}
          </button>
        )}
        <button type="button" disabled={disabled} onClick={() => onSelect(plan)}
          className={`h-10 w-full rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors disabled:cursor-not-allowed ${
            still ? 'bg-neutral-100 text-neutral-600'
              : isLocked ? 'bg-neutral-100 text-neutral-400'
              : highlight && !canTrial ? 'bg-neutral-900 text-white hover:bg-neutral-800'
              : 'border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50 hover:border-neutral-300'
          }`}>
          {isLocked && <Lock className="w-3.5 h-3.5" />}{mode === 'current' && !isLocked && <Check className="w-3.5 h-3.5 text-emerald-600" />}
          {isLocked ? 'Payment being verified' : LABEL[mode]}
        </button>
      </div>
    </article>
  );
}
