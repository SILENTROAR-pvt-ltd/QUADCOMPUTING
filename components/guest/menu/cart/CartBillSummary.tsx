import React from 'react';
import { CASHBACK_PERCENT, rupees } from '@/lib/guest/cashback';

interface CartBillSummaryProps {
  subtotal: number;
  cashback: number;
  signedIn: boolean;
  /** Whether this venue charges GST; null while it is not known yet (nothing is claimed). */
  gstApplicable: boolean | null;
}

/** The lines above the total: subtotal, the cashback this order earns, and plainly whether GST applies. */
export function CartBillSummary({ subtotal, cashback, signedIn, gstApplicable }: CartBillSummaryProps) {
  return (
    <div className="mt-3 space-y-1.5 border-t border-zinc-100 pt-3 text-xs text-zinc-600">
      <div className="flex items-center justify-between">
        <span>Subtotal</span>
        <span className="font-medium tabular-nums text-zinc-900">{rupees(subtotal)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span>{signedIn ? 'Cashback to your wallet' : 'Cashback when you sign in'} ({CASHBACK_PERCENT}%)</span>
        <span className={`font-semibold tabular-nums ${signedIn ? 'text-emerald-700' : 'text-zinc-900'}`}>+{rupees(cashback)}</span>
      </div>
      {gstApplicable !== null && (
        <div className="flex items-center justify-between">
          <span>GST</span>
          {gstApplicable ? <span className="font-medium text-zinc-900">Added to your bill</span> : <span className="text-zinc-500">Not applicable</span>}
        </div>
      )}
    </div>
  );
}
