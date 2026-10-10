'use client';

import { useState } from 'react';
import type { EodZReport } from '@/lib/services/analytics/eod-z-report.types';
import { CashDrawerAudit } from './CashDrawerAudit';
import { money, istLongDate, istTime, ZStat } from './ZReportParts';
import { OperationsSection, SalesSummarySection, TendersSection } from './ZReportSections';
import { HourlySection, SalesBreakdownSection } from './ZReportSalesTables';

const reportNo = (r: EodZReport) => `Z-${r.period.from.replace(/-/g, '')}`;

/** The printable end-of-day report: what was sold, how it was paid, the cash count and the day's operations. */
export function ZReportDocument({ report }: { report: EodZReport }) {
  const [openingCash, setOpeningCash] = useState('0');
  const [actualCash, setActualCash] = useState('');
  const { summary: s, operations: o } = report;
  const expectedCash = (Number(openingCash) || 0) + report.tenders.cash;
  const variance = actualCash === '' ? null : (Number(actualCash) || 0) - expectedCash;
  const generated = new Date(report.generated_at);

  return (
    <article className="mx-auto w-full max-w-3xl rounded-3xl border border-neutral-200 bg-white p-6 text-neutral-900 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-10 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <header className="flex flex-col gap-4 border-b-2 border-neutral-900 pb-5 sm:flex-row sm:items-start sm:justify-between print:flex-row">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">Z-report · End of day</p>
          <h2 className="mt-1 font-serif text-3xl tracking-tight text-neutral-950">{report.venue.name}</h2>
          <p className="mt-1 text-xs text-neutral-500">{report.venue.gstin ? `GSTIN ${report.venue.gstin}` : 'GSTIN not on file'}</p>
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-xs sm:text-right print:text-right">
          <dt className="text-neutral-500">Report no.</dt><dd className="font-mono font-semibold">{reportNo(report)}</dd>
          <dt className="text-neutral-500">Business day</dt><dd className="font-semibold">{istLongDate(report.period.from)}</dd>
          <dt className="text-neutral-500">Generated</dt>
          <dd className="font-mono">{generated.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short' })}, {istTime(report.generated_at)}</dd>
        </dl>
      </header>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 print:grid-cols-4">
        <ZStat label="Net sales" value={money(s.net_sales)} hint="After discounts, before tax" />
        <ZStat label="Collected" value={money(s.grand_total)} hint={`GST ${money(s.total_tax)}`} />
        <ZStat label="Settled bills" value={String(o.settled_bills)} hint={`Avg ${money(o.avg_bill)}`} />
        <ZStat label="Guests" value={String(o.guests)} hint={o.first_bill_at ? `${istTime(o.first_bill_at)} – ${istTime(o.last_bill_at)}` : 'No bills yet'} />
      </div>

      {report.truncated && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">This day has more bills than one report can hold; the figures cover the first 5,000.</p>
      )}

      <div className="mt-8 space-y-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 print:grid-cols-2">
          <SalesSummarySection s={s} />
          <TendersSection t={report.tenders} total={s.grand_total} />
        </div>
        <CashDrawerAudit
          n={3}
          openingCash={openingCash}
          actualCash={actualCash}
          systemCash={expectedCash}
          cashSales={report.tenders.cash}
          cashDiscrepancy={variance}
          onOpeningCashChange={setOpeningCash}
          onActualCashChange={setActualCash}
          formatCurrency={money}
        />
        <OperationsSection o={o} n={4} />
        <SalesBreakdownSection report={report} n={5} />
        <HourlySection hours={report.hourly} n={6} />
      </div>

      <footer className="mt-12 break-inside-avoid">
        <div className="grid grid-cols-2 gap-10 text-[11px] text-neutral-500">
          <div className="border-t border-neutral-400 pt-1.5">Closed by (cashier)</div>
          <div className="border-t border-neutral-400 pt-1.5">Verified by (manager)</div>
        </div>
        <p className="mt-8 text-center text-[10px] uppercase tracking-[0.2em] text-neutral-400">End of Z-report · {reportNo(report)}</p>
      </footer>
    </article>
  );
}
