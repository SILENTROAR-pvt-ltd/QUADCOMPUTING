'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { PaymentVerificationBanner } from '../wallet/PaymentVerificationBanner';
import { EarnDueBoxes } from '../wallet/EarnDueBoxes';
import { LedgerTable } from '../wallet/LedgerTable';
import { PaymentModal } from '../wallet/PaymentModal';
import { BillingDaySlips } from '../wallet/slips/BillingDaySlips';
import { useWalletWorkspace } from '../wallet/hooks/useWalletWorkspace';
import { useWalletInvoices } from '../wallet/useWalletInvoices';
import { PaymentCharts } from './PaymentCharts';

/**
 * Payments: everything about money in one place. What the venue earned and what it owes, the overview charts,
 * settling dues, the daily due slips (10 AM to 10 PM, closing at 10 PM) and the full usage ledger.
 */
export function PaymentsWorkspace({ venueId }: { venueId: string }) {
  const w = useWalletWorkspace(venueId);
  const inv = useWalletInvoices(venueId);

  const refresh = () => {
    void w.fetchWalletData();
    window.dispatchEvent(new CustomEvent('wallet:refresh'));
  };

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-neutral-950">Payments</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-500">
            What you earn from settled bills, what you owe in platform fees (₹3 a bill), each day&apos;s due slip, and every entry in your usage ledger.
          </p>
        </div>
        <button type="button" onClick={refresh} disabled={w.loading}
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${w.loading ? 'animate-spin' : ''}`} aria-hidden /> Refresh
        </button>
      </header>

      <PaymentVerificationBanner pendingRequest={w.pendingRequest} />
      {w.actionError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{w.actionError}</p>}

      <EarnDueBoxes summary={inv.summary} invoices={inv.invoices} loaded={inv.loaded} error={inv.error}
        onSettle={w.hasPendingApproval ? undefined : (amount) => w.openPayment({ kind: 'topup', amount })} />
      {w.hasPendingApproval && <p className="-mt-3 text-xs text-neutral-500">A payment is waiting for approval. Settle & pay opens again once it is confirmed.</p>}

      <PaymentCharts summary={inv.summary} summaryLoaded={inv.loaded} />
      <BillingDaySlips />
      <LedgerTable items={w.ledger} />

      <PaymentModal venueId={venueId} target={w.payFor} payment={w.payment} onClose={w.closePayment} onSubmitted={w.fetchWalletData} />
    </div>
  );
}

export default PaymentsWorkspace;
