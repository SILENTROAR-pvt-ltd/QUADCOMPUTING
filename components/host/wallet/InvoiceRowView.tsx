'use client';

import React from 'react';
import type { FeeStatus, InvoiceRow } from '@/lib/services/wallet/invoice-history.util';
import { formatInvoiceDate, formatRupees } from './money';

const FEE_CHIP: Record<FeeStatus, { label: string; tone: string }> = {
  due: { label: 'Due', tone: 'border-amber-200 bg-amber-50 text-amber-800' },
  deducted: { label: 'Paid from credit', tone: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  cleared: { label: 'Cleared', tone: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  none: { label: 'No fee', tone: 'border-neutral-200 bg-neutral-50 text-neutral-600' },
};

export const INVOICE_COLUMNS = 'sm:grid-cols-[1.4fr_1.2fr_1.2fr_.7fr_.9fr_.7fr_1fr]';

const Chip = ({ status }: { status: FeeStatus }) => (
  <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium ${FEE_CHIP[status].tone}`}>{FEE_CHIP[status].label}</span>
);

/** The order's daily number (ORD-014), when it has one. */
const OrderNo = ({ n }: { n?: string | null }) => (n ? <span className="ml-1.5 inline-flex rounded bg-neutral-100 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-neutral-700">{n}</span> : null);

const AfterHours = () => (
  <span className="ml-1.5 inline-flex whitespace-nowrap rounded-full bg-neutral-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-neutral-600" title="Settled outside 10 AM to 10 PM">After hours</span>
);

/** One settled bill: a compact two-line card on phones, a table row from the small breakpoint up. Tap it for the full invoice. */
export function InvoiceRowView({ inv, afterHours = false, onOpen }: { inv: InvoiceRow; afterHours?: boolean; onOpen?: (id: string) => void }) {
  const detail = [inv.where, inv.guest].filter(Boolean).join(' · ');
  const open = onOpen ? () => onOpen(inv.id) : undefined;
  return (
    <li className="px-1 py-3 transition-colors hover:bg-neutral-50/70" onClick={open} aria-label={open ? `Open invoice ${inv.invoice_number}` : undefined}
      role={open ? 'button' : undefined} tabIndex={open ? 0 : undefined} onKeyDown={open ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } } : undefined}
      style={open ? { cursor: 'pointer' } : undefined}>
      <div className="flex items-start justify-between gap-3 sm:hidden">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs font-semibold text-neutral-900">{inv.invoice_number}<OrderNo n={inv.order_number} /></p>
          <p className="mt-0.5 text-[11px] text-neutral-500">{formatInvoiceDate(inv.created_at)}{afterHours && <AfterHours />}</p>
          <p className="truncate text-[11px] text-neutral-500">{detail}{inv.payment_method ? ` · ${inv.payment_method}` : ''}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums text-neutral-950">{formatRupees(inv.grand_total)}</p>
          <p className="mt-0.5 text-[11px] tabular-nums text-neutral-500">Fee {formatRupees(inv.fee)}</p>
          <div className="mt-1"><Chip status={inv.fee_status} /></div>
        </div>
      </div>

      <div className={`hidden items-center gap-3 text-xs sm:grid ${INVOICE_COLUMNS}`}>
        <span className="truncate font-mono font-semibold text-neutral-900">{inv.invoice_number}<OrderNo n={inv.order_number} /></span>
        <span className="text-neutral-600">{formatInvoiceDate(inv.created_at)}{afterHours && <AfterHours />}</span>
        <span className="truncate text-neutral-600">{detail}</span>
        <span className="text-neutral-600">{inv.payment_method ?? '—'}</span>
        <span className="text-right font-semibold tabular-nums text-neutral-950">{formatRupees(inv.grand_total)}</span>
        <span className="text-right tabular-nums text-neutral-700">{formatRupees(inv.fee)}</span>
        <span className="text-right"><Chip status={inv.fee_status} /></span>
      </div>
    </li>
  );
}
