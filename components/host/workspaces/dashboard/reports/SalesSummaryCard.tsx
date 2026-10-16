'use client';

import React from 'react';
import type { ReportSummary } from '@/lib/services/analytics/reports.util';

type Row = { label: string; value: number; sign?: '−' | '+' | '='; strong?: boolean };

/** From dish prices to money collected, line by line, so every rupee in the total is accounted for. */
export function SalesSummaryCard({ s, format }: { s: ReportSummary; format: (n: number) => string }) {
  const rows: Row[] = [
    { label: 'Gross sales', value: s.gross_sales },
    { label: 'Discounts', value: s.discounts, sign: '−' },
    { label: 'Net sales', value: s.net_sales, sign: '=', strong: true },
    { label: 'GST', value: s.gst, sign: '+' },
    { label: 'Delivery fees', value: s.delivery_fees, sign: '+' },
    ...(s.other_charges !== 0 ? [{ label: 'Other charges & rounding', value: s.other_charges, sign: '+' as const }] : []),
    { label: 'Total collected', value: s.collected, sign: '=', strong: true },
  ];
  const chips = [
    `${s.settled_bills} settled ${s.settled_bills === 1 ? 'bill' : 'bills'}`,
    `Avg bill ${format(s.avg_bill)}`,
    `${s.items_sold} items sold`,
    ...(s.open_bills ? [`${s.open_bills} open · ${format(s.open_value)}`] : []),
    ...(s.cancelled_bills ? [`${s.cancelled_bills} cancelled · ${format(s.cancelled_value)}`] : []),
  ];

  return (
    <section aria-label="Sales summary" className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
      <h3 className="font-serif text-lg text-neutral-950">Sales summary</h3>
      <p className="text-[11px] text-neutral-500">Settled bills only. Open and cancelled bills are listed apart.</p>
      <dl className="mt-4 space-y-2 text-sm">
        {rows.map((r) => (
          <div key={r.label} className={`flex items-center justify-between gap-3 ${r.strong ? 'border-t border-neutral-100 pt-2 font-semibold text-neutral-950' : 'text-neutral-700'}`}>
            <dt className="flex items-center gap-2">
              <span aria-hidden className="w-3 text-center text-neutral-400">{r.sign ?? ''}</span>{r.label}
            </dt>
            <dd className="tabular-nums">{format(r.value)}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {chips.map((c) => <span key={c} className="rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-700">{c}</span>)}
      </div>
    </section>
  );
}
