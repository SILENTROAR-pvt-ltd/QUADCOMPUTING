'use client';

import React, { useState } from 'react';
import { FileText, ChevronDown, BadgeCheck } from 'lucide-react';
import { ThermalReceiptView } from '@/components/shared/receipt/ThermalReceiptView';
import { inr, istDateTime, shortDate, plural } from '@/components/stay/stay-format';
import { stayInvoiceData } from '@/components/stay/stay-invoice';
import type { RoomState } from './useRoomStay';

interface Props { invoice: NonNullable<RoomState['invoice']>; business: RoomState['business']; roomType: string | null }

/** The room's tax invoice exactly as the desk issued it when the room was paid: number, date, tender, every line. */
export function RoomInvoiceCard({ invoice, business, roomType }: Props) {
  const [open, setOpen] = useState(true);
  const data = stayInvoiceData(invoice, roomType);
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-[#e6d9b8] bg-white shadow-[0_18px_40px_-34px_rgba(10,50,34,0.5)]">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full cursor-pointer items-center gap-3 p-5 text-left">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-neutral-950 text-white"><FileText className="h-5 w-5" aria-hidden /></span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-neutral-950">Tax invoice · Room</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-800 ring-1 ring-inset ring-emerald-200"><BadgeCheck className="h-3 w-3" aria-hidden /> Paid · {invoice.payment_method}</span>
          </span>
          <span className="mt-0.5 block text-xs text-neutral-500">
            {invoice.invoice_id ? <>No. <span className="font-mono">{invoice.invoice_id.slice(0, 8).toUpperCase()}</span> · </> : null}
            {istDateTime(invoice.paid_at)} · {shortDate(invoice.check_in)} → {shortDate(invoice.check_out)} · {plural(invoice.nights, 'night')}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-sm font-semibold text-neutral-950">{inr(invoice.amount)}</span>
          <ChevronDown className={`h-4 w-4 text-neutral-400 transition ${open ? 'rotate-180' : ''}`} aria-hidden />
        </span>
      </button>
      {open && (
        <div className="border-t border-neutral-200 bg-[#faf9f6]">
          <ThermalReceiptView invoice={data} paymentMethod={`PAID · ${invoice.payment_method}`} venue={{ name: business.name, gstin: business.gstin, address: business.address }} showPayQr={false} />
        </div>
      )}
    </section>
  );
}
