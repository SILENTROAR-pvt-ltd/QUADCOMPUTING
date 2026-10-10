'use client';

import React from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { DashboardAnalyticsPayload } from './dashboard.types';
import { kpisOf } from './kpis';

interface KpiStripProps {
  data: DashboardAnalyticsPayload;
  formatCurrency: (n: number) => string;
}

function Delta({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400"><Minus className="h-3 w-3" /> No earlier sales</span>;
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${up ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(pct)}%
    </span>
  );
}

function Card({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">{label}</p>
      <p className="mt-2 font-serif text-3xl tabular-nums text-neutral-950">{value}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">{children}</div>
    </div>
  );
}

/** The period's headline figures, each from settled bills unless it says otherwise. */
export function KpiStrip({ data, formatCurrency }: KpiStripProps) {
  const k = kpisOf(data);
  const profit = Number(data.sales_overview?.gross_profit) || 0;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card label="Net sales" value={formatCurrency(k.net_sales)}>
        <Delta pct={k.growth_pct} />
        <span>vs previous period {k.previous_net_sales > 0 ? `(${formatCurrency(k.previous_net_sales)})` : ''}</span>
      </Card>
      <Card label="Settled bills" value={String(k.settled_bills)}>
        <span>Avg bill <strong className="font-semibold text-neutral-800">{formatCurrency(k.avg_bill)}</strong></span>
        {k.open_bills > 0 && <span className="rounded-md bg-sky-50 px-1.5 py-0.5 font-semibold text-sky-800">{k.open_bills} open · {formatCurrency(k.open_value)}</span>}
        {k.unique_guests > 0 && <span>{k.unique_guests} guests</span>}
      </Card>
      <Card label="Gross profit" value={formatCurrency(profit)}>
        {Number(data.actual_cogs) > 0 ? (
          <>
            <span>Margin <strong className="font-semibold text-neutral-800">{k.margin_pct === null ? '—' : `${k.margin_pct}%`}</strong></span>
            <span>COGS {formatCurrency(data.actual_cogs)}</span>
          </>
        ) : (
          // With no ingredient costs recorded, profit equals sales: say so rather than show a 100% margin.
          <span className="rounded-md bg-amber-50 px-1.5 py-0.5 font-medium text-amber-800">No ingredient costs recorded yet</span>
        )}
      </Card>
      <Card label="GST collected" value={formatCurrency(data.total_gst_collected)}>
        <span>Discounts given <strong className="font-semibold text-neutral-800">{formatCurrency(data.total_discounts_given)}</strong></span>
      </Card>
    </div>
  );
}

export default KpiStrip;
