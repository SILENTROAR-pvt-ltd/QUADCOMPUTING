'use client';

import React from 'react';
import { Download } from 'lucide-react';
import type { AnalyticsReports } from '@/lib/services/analytics/reports.util';
import { DailyBars } from '@/components/host/payments/DailyBars';
import { compactRupees } from '@/components/host/payments/chart-tokens';
import { CategoryBars } from './CategoryBars';
import { DonutChart } from './DonutChart';
import { GuestsCard } from './GuestsCard';
import { SalesSummaryCard } from './SalesSummaryCard';
import { ProfitLossCard } from './ProfitLossCard';
import { StaysCard } from './StaysCard';
import type { ProfitAndLoss } from '@/lib/services/analytics/pnl.util';
import { downloadCsv, reportCsv } from './report-csv';

const CARD = 'rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6';
// Categorical slots 1–3 (validated; light slots carry visible labels). Channel colours follow the channel, not its rank.
const CHANNEL_COLOR = { dine_in: '#2a78d6', rooms: '#1baf7a', delivery: '#eb6834', counter: '#8a6d2b' } as const;

interface Props { r: AnalyticsReports; pnl?: ProfitAndLoss; format: (n: number) => string; periodLabel: string; multiDay: boolean; truncated?: boolean }

/** The A-to-Z reports for the period: money breakdown, hours, weekdays, channels, categories and guests, with a CSV. */
export function ReportsSection({ r, pnl, format, periodLabel, multiDay, truncated }: Props) {
  const s = r.summary;
  const hoursWithSales = r.by_hour.filter((h) => h.bills > 0);
  // Only the hours the venue actually trades, padded by one either side, so the chart is not mostly empty night.
  const first = hoursWithSales.length ? Math.max(0, hoursWithSales[0].hour - 1) : 9;
  const last = hoursWithSales.length ? Math.min(23, hoursWithSales[hoursWithSales.length - 1].hour + 1) : 22;
  const hours = r.by_hour.slice(first, last + 1).map((h) => ({ key: String(h.hour), label: h.label, value: h.sales }));

  return (
    <section aria-label="Reports" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-serif text-2xl text-neutral-950">Reports</h2>
          <p className="text-xs text-neutral-500">{periodLabel} · settled bills · India time</p>
        </div>
        <button type="button" onClick={() => downloadCsv(`report-${periodLabel.replace(/[^\w]+/g, '-')}.csv`, reportCsv(r, periodLabel, pnl))}
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-xs font-semibold text-neutral-800 hover:bg-neutral-50">
          <Download className="h-4 w-4" aria-hidden /> Export CSV
        </button>
      </div>
      {truncated && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">This period has more bills than one report reads. Choose a shorter period for exact totals.</p>}

      {pnl && <ProfitLossCard p={pnl} format={format} />}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SalesSummaryCard s={s} format={format} />
        <div className={`${CARD} xl:col-span-2`}>
          <DailyBars title="Sales by hour" format={format} axisFormat={compactRupees} color="#2a78d6" data={hours}
            subtitle={r.peak_hour ? `Busiest: ${r.peak_hour.label} · ${format(r.peak_hour.sales)} from ${r.peak_hour.bills} ${r.peak_hour.bills === 1 ? 'bill' : 'bills'}` : 'No settled bills yet'} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={CARD}>
          <h3 className="font-serif text-lg text-neutral-950">Where sales came from</h3>
          <p className="mb-4 text-[11px] text-neutral-500">Total collected by channel</p>
          <DonutChart format={format} centerLabel="collected"
            slices={r.channels.filter((c) => c.sales > 0 || c.id !== 'rooms').map((c) => ({ id: c.id, label: c.label, value: c.sales, color: CHANNEL_COLOR[c.id], detail: `${c.bills} ${c.bills === 1 ? 'bill' : 'bills'}` }))} />
        </div>
        <CategoryBars categories={r.categories} format={format} />
        <GuestsCard g={r.guests} format={format} />
      </div>

      {/* A venue with rooms: the accommodation side, apart from the kitchen. */}
      {r.stays && (r.stays.stay_bills > 0 || r.segments?.rooms > 0) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <StaysCard s={r.stays} format={format} />
          <div className={`${CARD} lg:col-span-2`}>
            <h3 className="font-serif text-lg text-neutral-950">Kitchen and rooms</h3>
            <p className="mb-4 text-[11px] text-neutral-500">Net sales by business, after discounts, before GST</p>
            <DonutChart format={format} centerLabel="net sales"
              slices={[
                { id: 'food', label: 'Food & drinks', value: r.segments.food, color: '#2a78d6' },
                { id: 'rooms', label: 'Rooms & stays', value: r.segments.rooms, color: '#1baf7a', detail: `${r.stays.nights} nights` },
                { id: 'addons', label: 'Room add-ons', value: r.segments.room_addons, color: '#eb6834' },
                { id: 'extras', label: 'Check-out fees', value: r.segments.room_extras, color: '#8a6d2b' },
              ].filter((x) => x.value > 0)} />
          </div>
        </div>
      )}

      {multiDay && (
        <div className={CARD}>
          <DailyBars title="Sales by weekday" subtitle="Which days of the week sell most in this period" format={format} axisFormat={compactRupees}
            color="#2a78d6" data={r.by_weekday.map((w) => ({ key: w.label, label: w.label, value: w.sales }))} />
        </div>
      )}
    </section>
  );
}
