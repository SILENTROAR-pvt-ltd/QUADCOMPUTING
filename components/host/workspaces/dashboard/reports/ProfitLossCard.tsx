'use client';

import React from 'react';
import type { PnlLine, ProfitAndLoss } from '@/lib/services/analytics/pnl.util';

function Section({ title, lines, total, totalLabel, sign, format }: { title: string; lines: PnlLine[]; total: number; totalLabel: string; sign: '+' | '−'; format: (n: number) => string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{title}</p>
      <dl className="mt-1.5 space-y-1.5 text-sm">
        {lines.map((l) => (
          <div key={l.label} className={`flex items-baseline justify-between gap-3 ${l.amount === 0 ? 'text-neutral-400' : 'text-neutral-700'}`}>
            <dt className="min-w-0"><span className="mr-2 inline-block w-3 text-center text-neutral-400" aria-hidden>{sign}</span>{l.label}
              {l.note && <span className="ml-1.5 text-[11px] text-neutral-400">{l.note}</span>}</dt>
            <dd className="shrink-0 tabular-nums">{format(l.amount)}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-3 border-t border-neutral-100 pt-1.5 font-semibold text-neutral-950">
          <dt>{totalLabel}</dt><dd className="tabular-nums">{format(total)}</dd>
        </div>
      </dl>
    </div>
  );
}

function Result({ label, value, margin, format }: { label: string; value: number; margin: number | null; format: (n: number) => string }) {
  const loss = value < 0;
  return (
    <div className={`flex items-baseline justify-between gap-3 rounded-xl px-3 py-2.5 ${loss ? 'bg-rose-50 text-rose-900' : 'bg-emerald-50 text-emerald-900'}`}>
      <span className="text-sm font-semibold">{loss ? label.replace('profit', 'loss') : label}</span>
      <span className="text-right tabular-nums"><span className="text-base font-semibold">{format(value)}</span>
        {margin !== null && <span className="ml-2 text-xs opacity-80">{margin}% margin</span>}</span>
    </div>
  );
}

/** The period's profit and loss, every rupee in and out, from sales, stock, bills, salaries and platform fees. */
export function ProfitLossCard({ p, format }: { p: ProfitAndLoss; format: (n: number) => string }) {
  return (
    <section aria-label="Profit and loss" className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
      <h3 className="font-serif text-lg text-neutral-950">Profit &amp; loss</h3>
      <p className="text-[11px] text-neutral-500">Settled bills, stock movements, bills &amp; expenses, salaries and platform fees in this period</p>

      <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <Section title="Revenue (excl. GST)" lines={p.revenue} total={p.revenue_total} totalLabel="Revenue" sign="+" format={format} />
          <Section title="Cost of goods" lines={p.cogs} total={p.cogs_total} totalLabel="Cost of goods" sign="−" format={format} />
          <Result label="Gross profit" value={p.gross_profit} margin={p.gross_margin} format={format} />
        </div>
        <div className="space-y-4">
          <Section title="Operating expenses" lines={p.opex} total={p.opex_total} totalLabel="Operating expenses" sign="−" format={format} />
          <Result label="Net profit" value={p.net_profit} margin={p.net_margin} format={format} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5 text-[11px]">
        <span className="rounded-md bg-neutral-100 px-2 py-1 text-neutral-700">Stock bought {format(p.stock_purchased)} (cash out; costed as it is used)</span>
        <span className="rounded-md bg-neutral-100 px-2 py-1 text-neutral-700">GST to pay {format(p.gst_payable)}</span>
        {p.pending_bills > 0 && <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-800">{format(p.pending_bills)} of bills still unpaid</span>}
      </div>
      {!p.has_recipe_costs && (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">No ingredient use was costed in this period, so gross profit is overstated. Link dishes to recipes in Menu Catalog and keep stock costs in Raw Inventory.</p>
      )}
      {p.missing.length > 0 && (
        <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-800">Could not read: {p.missing.join(', ')}. Those costs are not in this statement.</p>
      )}
    </section>
  );
}
