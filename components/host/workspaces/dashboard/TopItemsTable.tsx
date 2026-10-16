'use client';

import React, { useState } from 'react';
import type { DashboardAnalyticsPayload } from './dashboard.types';
import { sharePct } from './chart-scale';

interface TopItemsTableProps {
  items: DashboardAnalyticsPayload['best_selling'];
  formatCurrency: (n: number) => string;
}

const FIRST = 6;

/** Best-selling dishes, ranked by sales at menu price (before bill discounts), with quantity and share of dish sales. */
export function TopItemsTable({ items, formatCurrency }: TopItemsTableProps) {
  const [all, setAll] = useState(false);
  const list = Array.isArray(items) ? items : [];
  const rows = all ? list.slice(0, 50) : list.slice(0, FIRST);
  const total = list.reduce((sum, i) => sum + (Number(i.revenue) || 0), 0);
  const top = Number(rows[0]?.revenue) || 1;

  return (
    <section aria-label="Top items" className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-serif text-lg text-neutral-950">Top items</h3>
        <span className="text-[11px] text-neutral-500">{list.length} dishes · at menu price</span>
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-neutral-400">No dishes sold in this period yet.</p>
      ) : (
        <ol className="mt-4 divide-y divide-neutral-100">
          {rows.map((item, idx) => {
            const revenue = Number(item.revenue) || 0;
            const share = sharePct(revenue, total);
            return (
              <li key={item.id || item.name} className="grid grid-cols-[1.75rem_1fr_auto] items-center gap-3 py-2.5">
                <span className={`grid h-7 w-7 place-items-center rounded-lg text-[11px] font-semibold tabular-nums ${idx < 3 ? 'bg-neutral-950 text-white' : 'bg-neutral-100 text-neutral-600'}`}>{idx + 1}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-950">{item.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100" aria-hidden>
                      <div className="h-full rounded-full bg-[#2a78d6]" style={{ width: `${Math.max((revenue / top) * 100, 3)}%` }} />
                    </div>
                    <span className="w-24 shrink-0 text-right text-[11px] tabular-nums text-neutral-500">{item.sold_count} sold · {share}%</span>
                  </div>
                </div>
                <span className="text-right text-sm font-semibold tabular-nums text-neutral-950">{formatCurrency(revenue)}</span>
              </li>
            );
          })}
        </ol>
      )}

      {list.length > FIRST && (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-2 cursor-pointer text-xs font-semibold text-neutral-700 hover:text-neutral-950">
          {all ? 'Show top 6' : `Show all ${Math.min(list.length, 50)}`}
        </button>
      )}
    </section>
  );
}

export default TopItemsTable;
