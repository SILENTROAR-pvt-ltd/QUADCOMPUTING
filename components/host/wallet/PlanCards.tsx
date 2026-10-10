'use client';

import React from 'react';
import { PLANS, type PlanInfo } from '@/lib/services/wallet/plans';
import type { PlanState } from '@/lib/services/wallet/subscription-state';
import { PlanCardItem } from './PlanCardItem';

interface PlanCardsProps {
  plan: PlanState;
  isLocked?: boolean;
  isLoading?: boolean;
  onSelectPlan: (plan: PlanInfo) => void;
}

export function PlanCards({ plan, isLocked, isLoading, onSelectPlan }: PlanCardsProps) {
  const running = plan.feesWaived ? plan.plan : null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="font-serif text-lg sm:text-xl font-medium tracking-tight text-neutral-900">Annual plans</h3>
          <p className="text-xs text-neutral-500">One yearly payment, no per-bill fees. Every plan adds free months on top of the year.</p>
        </div>
        {running && <p className="text-[11px] text-neutral-500">Buying again extends your current plan from its end date.</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((p) => (
          <PlanCardItem
            key={p.id}
            plan={p}
            isCurrent={running?.id === p.id}
            canRenew={running?.id === p.id && plan.phase === 'expiring'}
            highlight={running ? running.id === p.id : Boolean(p.popular)}
            isLocked={isLocked}
            isLoading={isLoading}
            onSelect={onSelectPlan}
          />
        ))}
      </div>
    </section>
  );
}
