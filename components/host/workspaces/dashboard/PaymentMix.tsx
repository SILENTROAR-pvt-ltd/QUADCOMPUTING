'use client';

import React from 'react';
import type { DashboardAnalyticsPayload } from './dashboard.types';
import { sharePct } from './chart-scale';

interface PaymentMixProps {
  breakdown: DashboardAnalyticsPayload['payment_breakdown'];
  formatCurrency: (n: number) => string;
}

const ROWS: Array<{ key: 'upi' | 'cash' | 'card' | 'other'; label: string; bar: string }> = [
  { key: 'upi', label: 'UPI', bar: 'bg-neutral-900' },
  { key: 'cash', label: 'Cash', bar: 'bg-emerald-600' },
  { key: 'card', label: 'Card', bar: 'bg-sky-600' },
  { key: 'other', label: 'Wallet, split & other', bar: 'bg-amber-500' },
];

/** How settled bills were paid, as a share of the period's sales. */
export function PaymentMix({ breakdown, formatCurrency }: PaymentMixProps) {
  const values = ROWS.map((r) => ({ ...r, value: Number(breakdown?.[r.key]) || 0 }));
  const total = values.reduce((sum, r) => sum + r.value, 0);

  return (
    <section aria-label="Payment mix" className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="flex items-baseline justify-between">
        <h3 className="font-serif text-lg text-neutral-950">Payment mix</h3>
        <span className="font-mono text-xs text-neutral-500">{formatCurrency(total)}</span>
      </div>

      <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-neutral-100" aria-hidden="true">
        {values.map((r) => r.value > 0 && <div key={r.key} className={r.bar} style={{ width: `${(r.value / total) * 100}%` }} />)}
      </div>

      <ul className="mt-5 space-y-3">
        {values.map((r) => (
          <li key={r.key} className="flex items-center gap-3 text-sm">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${r.bar}`} />
            <span className="flex-1 text-neutral-700">{r.label}</span>
            <span className="w-10 text-right font-mono text-xs text-neutral-500">{sharePct(r.value, total)}%</span>
            <span className="w-24 text-right font-mono text-sm font-semibold tabular-nums text-neutral-950">{formatCurrency(r.value)}</span>
          </li>
        ))}
      </ul>
      {total === 0 && <p className="mt-4 text-xs text-neutral-400">No settled bills in this period.</p>}
    </section>
  );
}

export default PaymentMix;
