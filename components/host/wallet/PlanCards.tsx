'use client';

import React from 'react';
import { PLANS, type PlanInfo } from '@/lib/services/wallet/plans';
import { paidPlanRunning, type PlanState } from '@/lib/services/wallet/subscription-state';
import { PlanCardItem, type CardMode } from './PlanCardItem';
import { PayAsYouGoBar } from './PayAsYouGoBar';

interface PlanCardsProps {
  plan: PlanState;
  /** The venue has not used its free month yet. */
  trialAvailable: boolean;
  isLocked?: boolean;
  isLoading?: boolean;
  starting?: boolean;
  switching?: boolean;
  onSelectPlan: (plan: PlanInfo) => void;
  onStartTrial: (plan: PlanInfo) => void;
  onSwitchPayAsYouGo: () => void;
}

/**
 * What each card offers this venue: its own plan to renew (or to buy outright during the free month), a bigger plan to
 * upgrade to, and a smaller one only from renewal, so no paid months are thrown away.
 */
function modeFor(p: PlanInfo, plan: PlanState): CardMode {
  const running = plan.feesWaived ? plan.plan : null;
  if (!running) return 'buy';
  if (running.id === p.id) return plan.onTrial ? 'trialing' : plan.phase === 'expiring' || plan.phase === 'grace' ? 'renew' : 'current';
  if (plan.onTrial || plan.phase === 'grace') return 'buy';
  return p.price > running.price ? 'upgrade' : 'later';
}

export function PlanCards({ plan, trialAvailable, isLocked, isLoading, starting, switching, onSelectPlan, onStartTrial, onSwitchPayAsYouGo }: PlanCardsProps) {
  const paidRunning = paidPlanRunning(plan);
  const highlighted = plan.feesWaived ? plan.plan?.id : null;

  return (
    <section className="space-y-4">
      <div>
        <h3 className="font-serif text-lg sm:text-xl font-medium tracking-tight text-neutral-900">Plans</h3>
        <p className="text-xs text-neutral-500">You earn, we earn at ₹3 a bill, or one yearly payment with no bill fee.</p>
      </div>
      <PayAsYouGoBar plan={plan} isLocked={isLocked} switching={switching} onSwitch={onSwitchPayAsYouGo} />
      <div className="flex flex-wrap items-end justify-between gap-2 pt-2">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Yearly plans</h4>
        {paidRunning && <p className="text-[11px] text-neutral-500">Renewing extends your plan from its end date.</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((p) => (
          <PlanCardItem
            key={p.id}
            plan={p}
            mode={modeFor(p, plan)}
            highlight={highlighted === p.id}
            canTrial={trialAvailable && p.trialDays > 0 && !plan.feesWaived}
            isLocked={isLocked}
            isLoading={isLoading}
            starting={starting}
            onSelect={onSelectPlan}
            onTrial={onStartTrial}
          />
        ))}
      </div>
    </section>
  );
}
