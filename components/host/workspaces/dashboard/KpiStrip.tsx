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
  const seg = data.reports?.segments;
  const stays = data.reports?.stays;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* The bill totals (GST and delivery fees included), compared like for like with the period before. */}
      <Card label="Total sales" value={formatCurrency(k.net_sales)}>
        <Delta pct={k.growth_pct} />
        <span>vs previous period {k.previous_net_sales > 0 ? `(${formatCurrency(k.previous_net_sales)})` : ''}</span>
        {/* A venue with rooms: the two businesses side by side, net of discounts. */}
        {seg && seg.rooms + seg.room_addons + seg.room_extras > 0 && (
          <span className="basis-full">
            Food <strong className="font-semibold text-neutral-800">{formatCurrency(seg.food)}</strong>
            <span className="mx-1.5 text-neutral-300">·</span>
            Rooms <strong className="font-semibold text-emerald-800">{formatCurrency(seg.rooms + seg.room_addons + seg.room_extras)}</strong>
            {stays && stays.nights > 0 && <span className="ml-1 text-neutral-400">({stays.nights} nights)</span>}
          </span>
        )}
      </Card>
      <Card label="Settled bills" value={String(k.settled_bills)}>
        <span>Avg bill <strong className="font-semibold text-neutral-800">{formatCurrency(k.avg_bill)}</strong></span>
        {k.open_bills > 0 && <span className="rounded-md bg-sky-50 px-1.5 py-0.5 font-semibold text-sky-800">{k.open_bills} open · {formatCurrency(k.open_value)}</span>}
        {k.unique_guests > 0 && <span>{k.unique_guests} guests</span>}
      </Card>
      {data.pnl ? (
        // The same net profit as the Profit & loss statement below: revenue less stock costs, bills, salaries and fees.
        <Card label={data.pnl.net_profit < 0 ? 'Net loss' : 'Net profit'} value={formatCurrency(data.pnl.net_profit)}>
          <span>Gross <strong className="font-semibold text-neutral-800">{formatCurrency(data.pnl.gross_profit)}</strong></span>
          <span>Expenses <strong className="font-semibold text-neutral-800">{formatCurrency(data.pnl.opex_total + data.pnl.cogs_total)}</strong></span>
          {data.pnl.net_margin !== null && <span>{data.pnl.net_margin}% margin</span>}
        </Card>
      ) : (
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
      )}
      <Card label="GST collected" value={formatCurrency(data.total_gst_collected)}>
        <span>Discounts given <strong className="font-semibold text-neutral-800">{formatCurrency(data.total_discounts_given)}</strong></span>
      </Card>
    </div>
  );
}

export default KpiStrip;
