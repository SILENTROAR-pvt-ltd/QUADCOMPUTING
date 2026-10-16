import React from 'react';
import { Check } from 'lucide-react';

interface BillSettledCardProps {
  tableNumber: string;
  total: number;
  /** Cashback actually written to the guest's wallet ledger for this bill; never derived from the total. */
  cashback: number;
  onBackToMenu: () => void;
}

/** The thank-you that replaces the bill once it is settled. */
export function BillSettledCard({ tableNumber, total, cashback, onBackToMenu }: BillSettledCardProps) {
  return (
    <div role="status" aria-live="polite" className="mx-auto max-w-xl overflow-hidden rounded-xl border border-emerald-200 bg-white text-center shadow-sm">
      <div className="bg-emerald-50 px-6 py-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm"><Check className="h-6 w-6" /></div>
        <p className="mt-3 text-[9px] font-bold uppercase tracking-wider text-emerald-700">Payment complete</p>
        <h2 className="mt-1 text-base font-semibold text-neutral-900">Bill settled. Thank you for visiting!</h2>
        <p className="mt-1 text-sm text-neutral-600">Table {tableNumber} is now vacant.</p>
        <p className="mt-3 font-mono text-lg font-semibold text-neutral-900">₹{total.toLocaleString('en-IN')}</p>
        {cashback > 0 && (
          <div className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-white px-3.5 py-1 text-xs font-semibold text-emerald-800 shadow-xs">
            <span>You earned <strong className="font-bold text-emerald-700">₹{cashback}</strong> cashback (7%) on this bill!</span>
          </div>
        )}
      </div>
      <button type="button" onClick={onBackToMenu} className="m-4 cursor-pointer rounded-lg border border-neutral-200 bg-neutral-100 px-4 py-2.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-200">Back to Menu</button>
    </div>
  );
}
