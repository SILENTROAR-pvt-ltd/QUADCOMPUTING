'use client';

import React from 'react';
import { ReceiptText } from 'lucide-react';
import { formatRupees } from '../money';
import { DaySlipCard } from './DaySlipCard';
import { SlipFilterBar } from './SlipFilterBar';
import { useDaySlips } from './useDaySlips';

/**
 * Daily due slips: one per billing day (10 AM to 10 PM IST, closing at 10 PM), with every settled bill, its ₹3 fee
 * and what is still due. Filter by range or day, fee status, payment and invoice, table or guest.
 */
export function BillingDaySlips() {
  const s = useDaySlips();
  const t = s.totals;

  return (
    <section aria-label="Daily due slips" className="rounded-2xl border border-neutral-200/90 bg-white p-4 shadow-xs sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-neutral-100 pb-4">
        <div className="flex items-start gap-2.5">
          <ReceiptText className="mt-1 h-4 w-4 text-neutral-500" aria-hidden />
          <div>
            <h3 className="font-serif text-lg font-medium tracking-tight text-neutral-900 sm:text-xl">Daily due slips</h3>
            <p className="mt-0.5 text-[11px] text-neutral-500">Each billing day runs 10:00 AM – 10:00 PM and closes at 10:00 PM. A bill settled after 10 PM goes on the next day&apos;s slip.</p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <SlipFilterBar query={s.query} today={s.today} search={s.search} filtered={s.filtered}
          onSearch={s.setSearch} onChange={s.update} onReset={s.reset} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-neutral-200/80 p-3 text-xs sm:grid-cols-4 sm:p-4" aria-live="polite">
        <div><dt className="text-neutral-500">Bills</dt><dd className="mt-0.5 text-base font-semibold tabular-nums text-neutral-950">{t.bills.toLocaleString('en-IN')}</dd></div>
        <div><dt className="text-neutral-500">Revenue</dt><dd className="mt-0.5 text-base font-semibold tabular-nums text-neutral-950">{formatRupees(t.revenue)}</dd></div>
        <div><dt className="text-neutral-500">Platform fees</dt><dd className="mt-0.5 text-base font-semibold tabular-nums text-neutral-950">{formatRupees(t.fees)}</dd></div>
        <div><dt className="text-neutral-500">Fee due</dt><dd className={`mt-0.5 text-base font-semibold tabular-nums ${t.feesDue > 0 ? 'text-amber-800' : 'text-emerald-700'}`}>{formatRupees(t.feesDue)}</dd></div>
      </dl>
      {s.truncated && <p className="mt-2 text-[11px] text-amber-700">This range has more bills than one view shows. Choose a shorter range for full totals.</p>}

      {s.error && (
        <p role="alert" className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {s.error}
          <button type="button" onClick={() => void s.retry()} className="cursor-pointer font-semibold underline underline-offset-2">Try again</button>
        </p>
      )}

      <div className="mt-4 space-y-3" aria-busy={s.loading}>
        {s.loading && s.days.length === 0 ? (
          [0, 1].map((i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-neutral-100" />)
        ) : s.days.length === 0 && !s.error ? (
          <p className="py-10 text-center text-xs text-neutral-400">{s.filtered ? 'No bills match these filters.' : 'No settled bills in this range.'}</p>
        ) : (
          s.days.map((d, i) => <DaySlipCard key={d.day} slip={d} isToday={d.day === s.today} defaultOpen={i === 0} />)
        )}
      </div>
    </section>
  );
}
