'use client';

import React from 'react';
import type { InvoiceRow } from '@/lib/services/wallet/invoice-history.util';
import type { InvoiceSummary } from '@/lib/services/wallet/invoice-history.service';
import { PAYG_BILL_FEE } from '@/lib/services/wallet/plans';
import { formatRupees } from './money';

interface Props {
  summary: InvoiceSummary | null;
  invoices: InvoiceRow[];
  loaded: boolean;
  error?: string | null;
  onSettle?: (amount: number) => void;
}

const BOX = 'relative flex min-h-[260px] min-w-0 flex-col rounded-2xl border border-neutral-200/90 bg-white p-4 shadow-xs sm:p-6';
const HEADING = 'text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600 sm:text-sm';
// Sized to the phone's width so a lakh-scale amount stays on one line in the half-width box; it wraps only past that.
const AMOUNT = 'mt-3 font-serif text-[clamp(17px,5vw,26px)] leading-tight tabular-nums text-neutral-950 [overflow-wrap:anywhere] sm:text-4xl';

/**
 * Two big boxes side by side, on phones too. "You earn" is the venue's real revenue from settled bills, with its latest
 * invoices; "We earn" is the platform fee still due (₹3 per settled bill) and the button to settle it.
 */
export function EarnDueBoxes({ summary, invoices, loaded, error, onSettle }: Props) {
  const due = summary?.feesDue ?? 0;
  const bills = summary?.invoiceCount ?? 0;

  return (
    <section aria-label="Revenue and dues" className="grid grid-cols-2 gap-3 sm:gap-4">
      <div className={BOX}>
        <p className={HEADING}>You earn</p>
        <p className={AMOUNT}>{loaded && summary ? formatRupees(summary.revenue) : '—'}</p>
        <p className="mt-1 text-xs text-neutral-500">
          {loaded && summary ? `Revenue from ${bills.toLocaleString('en-IN')} settled ${bills === 1 ? 'bill' : 'bills'}` : ' '}
        </p>
        {summary?.truncated && <p className="mt-1 text-[11px] text-amber-700">Showing the latest 50,000 bills.</p>}

        {!loaded ? (
          <div className="mt-5 space-y-2" aria-busy="true"><div className="h-3 animate-pulse rounded bg-neutral-100" /><div className="h-3 w-2/3 animate-pulse rounded bg-neutral-100" /></div>
        ) : error && invoices.length === 0 ? (
          <p role="alert" className="mt-5 text-xs text-rose-700">{error}</p>
        ) : invoices.length === 0 ? (
          <p className="mt-5 text-xs text-neutral-400">No settled bills yet. They appear here once a bill is settled.</p>
        ) : (
          <ul className="mt-4 flex-1 space-y-2 border-t border-neutral-100 pt-3">
            {invoices.slice(0, 4).map((inv) => (
              <li key={inv.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate font-mono text-[11px] text-neutral-600">{inv.invoice_number}</span>
                <span className="shrink-0 font-semibold tabular-nums text-neutral-900">{formatRupees(inv.grand_total)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={BOX}>
        <p className={HEADING}>We earn</p>
        <p className={AMOUNT}>{loaded && summary ? formatRupees(due) : '—'}</p>
        <p className="mt-1 text-xs text-neutral-500">
          {loaded && summary ? (summary.dueCount > 0 ? `Outstanding due · ${summary.dueCount} unpaid ${summary.dueCount === 1 ? 'bill' : 'bills'}` : 'Outstanding due · all clear') : ' '}
        </p>
        {loaded && summary && (
          <dl className="mt-4 space-y-1.5 border-t border-neutral-100 pt-3 text-xs">
            <div className="flex justify-between gap-2"><dt className="text-neutral-500">Fee per bill</dt><dd className="font-medium tabular-nums text-neutral-900">{formatRupees(PAYG_BILL_FEE)}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-neutral-500">Fees to date</dt><dd className="font-medium tabular-nums text-neutral-900">{formatRupees(summary.feesCharged)}</dd></div>
          </dl>
        )}
        <p className="mt-auto pb-12 pt-3 text-[11px] leading-relaxed text-neutral-500">Cleared by Quad Computing. Contact support if a due is not cleared.</p>
        <button type="button" disabled={due <= 0 || !onSettle} onClick={() => onSettle?.(Math.max(due, 100))}
          className="absolute bottom-3 right-3 h-9 cursor-pointer rounded-lg bg-neutral-950 px-3.5 text-xs font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40">
          Settle &amp; pay
        </button>
      </div>
    </section>
  );
}
