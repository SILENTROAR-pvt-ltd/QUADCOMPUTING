'use client';

import React from 'react';
import { formatRupees } from '../wallet/money';
import { SERIES } from './chart-tokens';

export interface MethodTotal { method: 'UPI' | 'CASH' | 'CARD' | 'OTHER'; label: string; amount: number; bills: number }

/** How the range's revenue was paid. One hue (it is all "you earn" money); each bar is labelled with its amount and share. */
export function PaymentMethodSplit({ methods, rangeLabel }: { methods: MethodTotal[]; rangeLabel: string }) {
  const total = methods.reduce((a, m) => a + m.amount, 0);
  const max = Math.max(1, ...methods.map((m) => m.amount));

  return (
    <figure className="min-w-0">
      <figcaption>
        <p className="text-sm font-semibold text-neutral-900">How guests paid</p>
        <p className="text-[11px] text-neutral-500">{rangeLabel} · revenue by payment method</p>
      </figcaption>
      {total === 0 ? (
        <p className="mt-4 text-xs text-neutral-400">No settled bills in this range.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {methods.map((m) => (
            <li key={m.method} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 text-xs">
              <span className="text-neutral-700">{m.label}</span>
              <span className="h-2.5 overflow-hidden rounded-full bg-neutral-100" aria-hidden>
                <span className="block h-full rounded-full" style={{ width: `${(m.amount / max) * 100}%`, background: SERIES.youEarn, minWidth: m.amount > 0 ? 4 : 0 }} />
              </span>
              <span className="text-right tabular-nums">
                <span className="font-semibold text-neutral-950">{formatRupees(m.amount)}</span>
                <span className="ml-1.5 text-neutral-500">{Math.round((m.amount / total) * 100)}% · {m.bills} {m.bills === 1 ? 'bill' : 'bills'}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}
