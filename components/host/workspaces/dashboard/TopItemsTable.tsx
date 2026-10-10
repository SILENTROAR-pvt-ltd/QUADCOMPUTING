'use client';

import React from 'react';
import type { DashboardAnalyticsPayload } from './dashboard.types';
import { sharePct } from './chart-scale';

interface TopItemsTableProps {
  items: DashboardAnalyticsPayload['best_selling'];
  formatCurrency: (n: number) => string;
}

const SHOWN = 8;

/** The best-selling dishes of the period, ranked by revenue, with their share of item sales. */
export function TopItemsTable({ items, formatCurrency }: TopItemsTableProps) {
  const rows = (Array.isArray(items) ? items : []).slice(0, SHOWN);
  const total = (Array.isArray(items) ? items : []).reduce((sum, i) => sum + (Number(i.revenue) || 0), 0);

  return (
    <section aria-label="Top items" className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="flex items-baseline justify-between">
        <h3 className="font-serif text-lg text-neutral-950">Top items</h3>
        <span className="text-[11px] text-neutral-500">by revenue</span>
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-neutral-400">No items sold in this period yet.</p>
      ) : (
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              <th className="w-8 pb-2 font-bold">#</th>
              <th className="pb-2 font-bold">Item</th>
              <th className="w-16 pb-2 text-right font-bold">Qty</th>
              <th className="w-28 pb-2 text-right font-bold">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((item, idx) => {
              const share = sharePct(Number(item.revenue) || 0, total);
              return (
                <tr key={item.id || item.name}>
                  <td className="py-2.5 font-mono text-xs text-neutral-400">{idx + 1}</td>
                  <td className="py-2.5 pr-3">
                    <p className="truncate font-medium text-neutral-950">{item.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
                        <div className="h-full rounded-full bg-neutral-900" style={{ width: `${Math.max(share, 2)}%` }} />
                      </div>
                      <span className="w-9 text-right font-mono text-[10px] text-neutral-500">{share}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-neutral-700">{item.sold_count}</td>
                  <td className="py-2.5 text-right font-mono font-semibold tabular-nums text-neutral-950">{formatCurrency(item.revenue)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default TopItemsTable;
