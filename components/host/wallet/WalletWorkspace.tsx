'use client';

import React from 'react';
import { WalletHeader } from './WalletHeader';
import { PaymentVerificationBanner } from './PaymentVerificationBanner';
import { WalletBalanceCard } from './WalletBalanceCard';
import { PlanStatusCard } from './PlanStatusCard';
import { PlanCards } from './PlanCards';
import { LedgerTable } from './LedgerTable';
import { OutstandingBillingSection } from './OutstandingBillingSection';
import { PaymentModal } from './PaymentModal';
import { useWalletWorkspace } from './hooks/useWalletWorkspace';

interface WalletWorkspaceProps {
  venueId: string;
  onNavigate?: (tab: string) => void;
}

export function WalletWorkspace({ venueId }: WalletWorkspaceProps) {
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

      <PlanCards plan={w.plan} isLocked={locked} isLoading={w.loading} onSelectPlan={(plan) => w.openPayment({ kind: 'plan', plan })} />
      <OutstandingBillingSection venueId={venueId} />
      <LedgerTable items={w.ledger} />

      <PaymentModal venueId={venueId} target={w.payFor} payment={w.payment} onClose={w.closePayment} onSubmitted={w.fetchWalletData} />
    </div>
  );
}

export default WalletWorkspace;
