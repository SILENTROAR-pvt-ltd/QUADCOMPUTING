'use client';

import React, { useState } from 'react';
import type { InvoiceSummary } from '@/lib/services/wallet/invoice-history.service';
import { formatRupees } from '../wallet/money';
import { SERIES, compactRupees } from './chart-tokens';
import { DailyBars } from './DailyBars';
import { EarnShareDonut } from './EarnShareDonut';
import { PaymentMethodSplit } from './PaymentMethodSplit';
import { usePaymentTrend, type TrendDays } from './usePaymentTrend';

const SPANS: TrendDays[] = [7, 14, 30];
const CARD = 'rounded-2xl border border-neutral-200/90 bg-white p-4 shadow-xs sm:p-5';

/** The overview: you earn against we earn (all time), each day's revenue and fees, and how guests paid. */
export function PaymentCharts({ summary, summaryLoaded }: { summary: InvoiceSummary | null; summaryLoaded: boolean }) {
  const [span, setSpan] = useState<TrendDays>(14);
  const t = usePaymentTrend(span);
  const rangeLabel = `Last ${span} billing days`;
  const bars = (key: 'revenue' | 'fees') => t.points.map((p) => ({ key: p.day, label: p.label, value: p[key] }));
  const sum = (key: 'revenue' | 'fees') => t.points.reduce((a, p) => a + p[key], 0);

  return (
    <section aria-label="Payments overview" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-serif text-lg font-medium tracking-tight text-neutral-900 sm:text-xl">Overview</h3>
        <div role="radiogroup" aria-label="Chart range" className="inline-flex gap-1 rounded-xl bg-neutral-100 p-1">
          {SPANS.map((s) => (
            <button key={s} type="button" role="radio" aria-checked={span === s} onClick={() => setSpan(s)}
              className={`h-8 cursor-pointer rounded-lg px-3 text-xs font-semibold ${span === s ? 'bg-white text-neutral-950 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}>
              {s} days
            </button>
          ))}
        </div>
      </div>

      {t.error && (
        <p role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {t.error}<button type="button" onClick={() => void t.retry()} className="cursor-pointer font-semibold underline underline-offset-2">Try again</button>
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
        <div className={CARD}>
          <EarnShareDonut revenue={summary?.revenue ?? 0} fees={summary?.feesCharged ?? 0} loaded={summaryLoaded && Boolean(summary)} />
        </div>
        <div className={`${CARD} lg:col-span-2`}>
          {t.loaded ? (
            <DailyBars title="You earn per day" subtitle={`${rangeLabel} · ${formatRupees(sum('revenue'))} from settled bills`}
              data={bars('revenue')} color={SERIES.youEarn} format={formatRupees} axisFormat={compactRupees} />
          ) : <div className="h-56 animate-pulse rounded-xl bg-neutral-100" aria-busy="true" />}
        </div>
        <div className={`${CARD} lg:col-span-2`}>
          {t.loaded ? (
            <DailyBars title="We earn per day" subtitle={`${rangeLabel} · ${formatRupees(sum('fees'))} in platform fees, ₹3 a bill`}
              data={bars('fees')} color={SERIES.weEarn} format={formatRupees} axisFormat={compactRupees} />
          ) : <div className="h-56 animate-pulse rounded-xl bg-neutral-100" aria-busy="true" />}
        </div>
        <div className={CARD}>
          <PaymentMethodSplit methods={t.methods} rangeLabel={rangeLabel} />
        </div>
      </div>
    </section>
  );
}
