'use client';

import React from 'react';
import { Receipt, UtensilsCrossed, Wallet } from 'lucide-react';
import { BillWalletRedeem } from '@/components/guest/menu/BillWalletRedeem';

const inr = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const OUTLINE = 'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-2xl border border-neutral-200 px-4 py-2.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-50';

interface WalletCardProps {
  venueName: string;
  loading: boolean;
  balance: number;
  totalEarned: number;
  visits: number;
  canUse: boolean;
  onUse: () => void;
}

/** The guest's balance at this venue, what they have earned in all, and the way to use it. */
export function WalletCard({ venueName, loading, balance, totalEarned, visits, canUse, onUse }: WalletCardProps) {
  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium text-neutral-500"><Wallet className="h-3.5 w-3.5" /> Wallet at {venueName}</p>
          <p className="mt-1 font-serif text-4xl tracking-tight text-neutral-950">{loading ? '—' : inr(balance)}</p>
          <p className="mt-1 text-xs text-neutral-500">{inr(totalEarned)} earned in total{visits > 0 ? ` · ${visits} ${visits === 1 ? 'visit' : 'visits'}` : ''}</p>
        </div>
        <button type="button" onClick={onUse} disabled={!canUse}
          className="shrink-0 cursor-pointer rounded-2xl bg-neutral-950 px-4 py-2.5 text-xs font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40">
          Use balance
        </button>
      </div>
    </section>
  );
}

interface VisitCardProps {
  cafeId: string;
  tableNumber: string;
  runningTotal: number;
  hasActiveOrder: boolean;
  billSettled: boolean;
  onOpenBill: () => void;
  onOpenMenu: () => void;
}

/** This visit: the running bill with a way to view it, or a way back to the menu when nothing is ordered. */
export function VisitCard({ cafeId, tableNumber, runningTotal, hasActiveOrder, billSettled, onOpenBill, onOpenMenu }: VisitCardProps) {
  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6">
      <p className="text-xs font-medium text-neutral-500">This visit · Table {tableNumber}</p>
      {hasActiveOrder ? (
        <div className="mt-2 flex items-center justify-between gap-4">
          <div>
            <p className="font-serif text-2xl text-neutral-950">{inr(runningTotal)}</p>
            <p className="text-xs text-neutral-500">Running bill, before tax</p>
          </div>
          <button type="button" onClick={onOpenBill} className={OUTLINE}><Receipt className="h-3.5 w-3.5" /> View bill</button>
        </div>
      ) : (
        <div className="mt-2 flex items-center justify-between gap-4">
          <p className="text-sm text-neutral-600">{billSettled ? 'Your bill is settled. Thank you for visiting!' : 'Nothing ordered yet.'}</p>
          {!billSettled && <button type="button" onClick={onOpenMenu} className={OUTLINE}><UtensilsCrossed className="h-3.5 w-3.5" /> Browse menu</button>}
        </div>
      )}
      {hasActiveOrder && <BillWalletRedeem cafeId={cafeId} tableNumber={tableNumber} />}
    </section>
  );
}
