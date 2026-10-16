'use client';

import React from 'react';
import type { ZSalesLine } from '@/lib/services/analytics/eod-z-report.types';

const SHOW = 7;
const BAR = '#2a78d6';

/** Net sales by category, largest first; past seven the rest fold into one "Other" row so the list stays readable. */
export function CategoryBars({ categories, format }: { categories: ZSalesLine[]; format: (n: number) => string }) {
  const head = categories.slice(0, SHOW);
  const tail = categories.slice(SHOW);
  const rows = tail.length
    ? [...head, { name: `Other (${tail.length})`, qty: tail.reduce((a, c) => a + c.qty, 0), net_sales: tail.reduce((a, c) => a + c.net_sales, 0), share: tail.reduce((a, c) => a + c.share, 0) }]
    : head;
  const max = Math.max(1, ...rows.map((r) => r.net_sales));

  return (
    <section aria-label="Sales by category" className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
      <h3 className="font-serif text-lg text-neutral-950">Sales by category</h3>
      <p className="text-[11px] text-neutral-500">Net of bill discounts, shared over each bill&apos;s dishes</p>
      {rows.length === 0 ? <p className="mt-4 text-xs text-neutral-400">No dishes sold in this period.</p> : (
        <ul className="mt-4 space-y-3">
          {rows.map((r) => (
            <li key={r.name} className="text-xs">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate font-medium text-neutral-800">{r.name}</span>
                <span className="shrink-0 tabular-nums"><span className="font-semibold text-neutral-950">{format(r.net_sales)}</span>
                  <span className="ml-1.5 text-neutral-500">{Math.round(r.share)}% · {r.qty} sold</span></span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-100" aria-hidden>
                <div className="h-full rounded-full" style={{ width: `${(r.net_sales / max) * 100}%`, background: BAR, minWidth: r.net_sales > 0 ? 4 : 0 }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
