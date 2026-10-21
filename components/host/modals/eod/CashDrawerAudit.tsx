'use client';

import React from 'react';
import type { ZTenders } from '@/lib/services/analytics/eod-z-report.types';
import { ZRow, ZSection } from './ZReportParts';

interface CashDrawerAuditProps {
  openingCash: string;
  actualCash: string;
  systemCash: number;
  cashDiscrepancy: number | null;
  onOpeningCashChange: (val: string) => void;
  onActualCashChange: (val: string) => void;
  formatCurrency: (val: number) => string;
  /** Section number in the report. */
  n?: number;
  /** The day's cash side: the bills, the notes handed over and the change returned. */
  tenders?: Pick<ZTenders, 'cash' | 'cash_received' | 'change_given'>;
}

const input = 'h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 font-mono text-sm text-neutral-950 outline-none focus:border-neutral-500 print:hidden';

/**
 * Counts the drawer against what the till says should be in it. The drawer took in every note the guests handed over and
 * gave back their change, so both are shown: what came in, what went out, and the cash sales that stay (their difference).
 */
export function CashDrawerAudit(props: CashDrawerAuditProps) {
  const { openingCash, actualCash, systemCash, cashDiscrepancy, formatCurrency, n = 3, tenders } = props;
  const status = cashDiscrepancy === null ? null
    : Math.abs(cashDiscrepancy) < 0.01 ? { text: 'Balanced', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200' }
    : cashDiscrepancy > 0 ? { text: `Over by ${formatCurrency(cashDiscrepancy)}`, cls: 'bg-sky-50 text-sky-800 ring-sky-200' }
    : { text: `Short by ${formatCurrency(Math.abs(cashDiscrepancy))}`, cls: 'bg-rose-50 text-rose-800 ring-rose-200' };
  const change = tenders?.change_given || 0;

  return (
    <ZSection n={n} title="Cash drawer" aside={status ? <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${status.cls}`}>{status.text}</span> : 'Count the drawer to close'}>
      <div className="grid grid-cols-1 gap-3 py-2 sm:grid-cols-2 print:hidden">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-neutral-600">Opening float</span>
          <input type="number" inputMode="decimal" min={0} value={openingCash} onChange={(e) => props.onOpeningCashChange(e.target.value)} className={input} placeholder="0" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-neutral-600">Cash counted in drawer</span>
          <input type="number" inputMode="decimal" min={0} value={actualCash} onChange={(e) => props.onActualCashChange(e.target.value)} className={input} placeholder="Enter the count" />
        </label>
      </div>
      <ZRow label="Opening float" value={formatCurrency(Number(openingCash) || 0)} />
      {tenders && (
        <>
          <ZRow label="Cash received from guests" value={formatCurrency(tenders.cash_received)} />
          {change > 0 && <ZRow label="Change returned" value={`− ${formatCurrency(change)}`} tone="minus" />}
          <ZRow label="Cash sales (kept in drawer)" value={formatCurrency(tenders.cash)} tone="strong" />
        </>
      )}
      <ZRow label="Expected in drawer" value={formatCurrency(systemCash)} tone="strong" />
      <ZRow label="Counted" value={actualCash === '' ? '—' : formatCurrency(Number(actualCash) || 0)} />
      {cashDiscrepancy !== null && (
        <ZRow label="Variance" value={`${cashDiscrepancy >= 0 ? '+' : '−'} ${formatCurrency(Math.abs(cashDiscrepancy))}`} tone={Math.abs(cashDiscrepancy) < 0.01 ? 'strong' : 'minus'} />
      )}
    </ZSection>
  );
}
