'use client';

import React from 'react';
import { PAYG_FEES } from '@/lib/services/wallet/plans';

/** The per-action platform fees, shown as free while a plan covers them. */
export function FeeScheduleBadges({ feesWaived }: { feesWaived: boolean }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Platform fees">
      {PAYG_FEES.map((f) => {
        const free = feesWaived || f.amount === 0;
        return (
          <li key={f.label} className="rounded-lg border border-neutral-200/80 bg-neutral-50 px-2.5 py-1 text-[11px] text-neutral-600">
            {f.label}: <strong className={free ? 'text-emerald-700' : 'text-neutral-900'}>{free ? 'Free' : `₹${f.amount}`}</strong>
          </li>
        );
      })}
    </ul>
  );
}
