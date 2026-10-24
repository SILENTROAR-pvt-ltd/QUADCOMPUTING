'use client';

import React from 'react';
import { ArrowRight, Banknote } from 'lucide-react';
import { WalletHeader } from './WalletHeader';
import { PaymentVerificationBanner } from './PaymentVerificationBanner';
import { WalletBalanceCard } from './WalletBalanceCard';
import { PlanStatusCard } from './PlanStatusCard';
import { PlanCards } from './PlanCards';
import { PlanCompareTable } from './PlanCompareTable';
import { PerBillCalculator } from './PerBillCalculator';
import { PaymentModal } from './PaymentModal';
import { VibeyAddonCard } from './VibeyAddonCard';
import { useWalletWorkspace } from './hooks/useWalletWorkspace';

interface WalletWorkspaceProps {
  venueId: string;
  onNavigate?: (tab: string) => void;
}

/** The plan and the credit wallet. Earnings, dues, daily slips and the usage ledger live in Payments. */
export function WalletWorkspace({ venueId, onNavigate }: WalletWorkspaceProps) {
  const w = useWalletWorkspace(venueId);
  const locked = w.hasPendingApproval;

  return (
    <div className="pb-20 space-y-6">
      <WalletHeader loading={w.loading} onRefresh={w.fetchWalletData} />
      <PaymentVerificationBanner pendingRequest={w.pendingRequest} />
      {w.actionError && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{w.actionError}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PlanStatusCard
          plan={w.plan}
          isLoading={w.loading}
          isLocked={locked}
          switching={w.switching}
          onRenew={() => w.plan.plan && w.openPayment({ kind: 'plan', plan: w.plan.plan })}
          onSwitchPayAsYouGo={w.switchToPayAsYouGo}
        />
        <WalletBalanceCard
          wallet={w.wallet}
          feesWaived={w.plan.feesWaived}
          isLoading={w.loading}
          isLocked={locked}
          onTopUp={(amount) => w.openPayment({ kind: 'topup', amount })}
        />
      </div>

      <PlanCards plan={w.plan} trialAvailable={w.trialAvailable} isLocked={locked} isLoading={w.loading} starting={w.starting} switching={w.switching}
        onSelectPlan={(plan) => w.openPayment({ kind: 'plan', plan })} onStartTrial={w.startTrial} onSwitchPayAsYouGo={w.switchToPayAsYouGo} />
      <VibeyAddonCard eligible={w.vibeyAddon.eligible} included={w.vibeyAddon.included} until={w.vibeyAddon.until} isLocked={locked}
        onBuy={() => w.openPayment({ kind: 'addon' })} />
      <PlanCompareTable />
      <PerBillCalculator />

      {onNavigate && (
        <button type="button" onClick={() => onNavigate('payments')}
          className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-2xl border border-neutral-200/90 bg-white p-5 text-left shadow-xs hover:border-neutral-400">
          <span className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-100"><Banknote className="h-5 w-5 text-neutral-900" aria-hidden /></span>
            <span>
              <span className="block text-sm font-semibold text-neutral-950">Payments, dues and invoices</span>
              <span className="block text-xs text-neutral-500">What you earn, what you owe, daily due slips, Settle &amp; pay and the usage ledger.</span>
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-neutral-500" aria-hidden />
        </button>
      )}

      <PaymentModal venueId={venueId} target={w.payFor} payment={w.payment} onClose={w.closePayment} onSubmitted={w.fetchWalletData} />
    </div>
  );
}

export default WalletWorkspace;
