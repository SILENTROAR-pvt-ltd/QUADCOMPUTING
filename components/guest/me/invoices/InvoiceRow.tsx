'use client';

import React from 'react';
import { ChevronRight, Receipt } from 'lucide-react';
import type { GuestInvoice } from '@/lib/services/guest-auth/guest-bills.service';
import { inr, timeLabel } from '../wallet-history/history-format';

/** One settled bill: invoice number and table, where and when and how it was paid, and the total. Opens the invoice. */
export function InvoiceRow({ invoice: inv, onOpen }: { invoice: GuestInvoice; onOpen: (inv: GuestInvoice) => void }) {
  return (
    <li>
      <button type="button" onClick={() => onOpen(inv)} className="flex w-full cursor-pointer items-center gap-3 px-5 py-3.5 text-left hover:bg-neutral-50 sm:px-6">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600"><Receipt className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-neutral-900">Invoice #{inv.invoice_no}{inv.table_number ? ` · Table ${inv.table_number}` : ''}</p>
          <p className="mt-0.5 truncate text-[11px] text-neutral-500">
            <span className="inline-block rounded-md bg-neutral-100 px-1.5 py-0.5 font-medium text-neutral-700">{inv.venue_name}</span>
            {' '}{timeLabel(inv.created_at)} · {inv.payment_method}{inv.cashback > 0 ? ` · +${inr(inv.cashback)} cashback` : ''}
          </p>
        </div>
        <p className="shrink-0 text-sm font-semibold text-neutral-900">{inr(inv.grand_total)}</p>
        <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
      </button>
    </li>
  );
}
