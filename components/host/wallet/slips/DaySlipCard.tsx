'use client';

import React, { useCallback, useState } from 'react';
import { InvoiceDetailModal } from '../InvoiceDetailModal';
import { ChevronDown, Printer } from 'lucide-react';
import type { DaySlip } from '@/lib/services/wallet/day-slips.util';
import { formatRupees } from '../money';
import { INVOICE_COLUMNS, InvoiceRowView } from '../InvoiceRowView';
import { dayLabel } from './slip-format';
import { printSlip } from './print-slip';

const HEAD = 'text-[10px] font-semibold uppercase tracking-wider text-neutral-500';

function Stat({ label, value, tone = 'text-neutral-950' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-neutral-50 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
      <p className={`mt-0.5 truncate text-sm font-semibold tabular-nums sm:text-base ${tone}`}>{value}</p>
    </div>
  );
}

/** One billing day's due slip: the window, the day's totals, and its bills on demand. */
export function DaySlipCard({ slip, isToday, defaultOpen }: { slip: DaySlip; isToday: boolean; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [printBlocked, setPrintBlocked] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const closeInvoice = useCallback(() => setOpenId(null), []);

  return (
    <article className="rounded-2xl border border-neutral-200/90 bg-white p-4 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-neutral-950 sm:text-base">
            {dayLabel(slip.day)}
            {isToday && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 ring-1 ring-emerald-200">Today · open until 10 PM</span>}
          </h4>
          <p className="mt-0.5 text-[11px] text-neutral-500">10:00 AM – 10:00 PM · closes at 10:00 PM{slip.afterHours ? ` · ${slip.afterHours} after hours` : ''}</p>
        </div>
        <button type="button" onClick={() => setPrintBlocked(!printSlip(slip))}
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-50">
          <Printer className="h-3.5 w-3.5" aria-hidden /> Print slip
        </button>
      </header>
      {printBlocked && <p role="alert" className="mt-2 text-[11px] text-amber-700">Allow pop-ups for this site to print the slip.</p>}

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Bills" value={slip.bills.toLocaleString('en-IN')} />
        <Stat label="Revenue" value={formatRupees(slip.revenue)} />
        <Stat label="Fees" value={formatRupees(slip.fees)} />
        <Stat label="Fee due" value={formatRupees(slip.feesDue)} tone={slip.feesDue > 0 ? 'text-amber-800' : 'text-emerald-700'} />
      </div>

      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)}
        className="mt-3 inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-neutral-950">
        {open ? 'Hide bills' : `Show ${slip.bills} ${slip.bills === 1 ? 'bill' : 'bills'}`}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open && (
        <div className="mt-2">
          <div className={`hidden gap-3 px-1 pb-2 sm:grid ${INVOICE_COLUMNS}`}>
            <span className={HEAD}>Invoice</span><span className={HEAD}>Date</span><span className={HEAD}>Table · guest</span>
            <span className={HEAD}>Payment</span><span className={`${HEAD} text-right`}>Bill</span>
            <span className={`${HEAD} text-right`}>Fee</span><span className={`${HEAD} text-right`}>Fee status</span>
          </div>
          <ul className="divide-y divide-neutral-100 border-t border-neutral-100">
            {slip.rows.map((r) => <InvoiceRowView key={r.id} inv={r} afterHours={r.after_hours} onOpen={setOpenId} />)}
          </ul>
        </div>
      )}
      {openId && <InvoiceDetailModal invoiceId={openId} onClose={closeInvoice} />}
    </article>
  );
}
