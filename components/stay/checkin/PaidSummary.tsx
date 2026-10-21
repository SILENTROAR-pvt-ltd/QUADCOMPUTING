'use client';

import React, { useState } from 'react';
import { BadgeCheck, ChevronDown } from 'lucide-react';
import { ThermalReceiptView } from '@/components/shared/receipt/ThermalReceiptView';
import { inr, plural, shortDate } from '../stay-format';
import { stayInvoiceData } from '../stay-invoice';
import type { PassView } from './useSelfCheckIn';

interface Props { pass: PassView; venue: { name: string; gstin?: string | null; address?: string | null } | null }

/** What the guest has paid for, and, one tap away, the same tax invoice the desk printed: venue, GSTIN, invoice number, itemised lines. */
export function PaidSummary({ pass, venue }: Props) {
  const [open, setOpen] = useState(false);
  const invoice = stayInvoiceData(pass, pass.room_type);

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-[#e6d9b8] bg-white shadow-[0_18px_40px_-28px_rgba(10,50,34,0.45)]">
      {pass.photo && (
        <div className="relative h-32 bg-neutral-100">
          {/* eslint-disable-next-line @next/next/no-img-element -- venue photos come from the venue's own storage */}
          <img src={pass.photo} alt="" className="h-full w-full object-cover" decoding="async" />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/10 to-transparent" />
        </div>
      )}
      <div className={`p-5 ${pass.photo ? '-mt-5 relative' : ''}`}>
        <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-800 ring-1 ring-inset ring-emerald-200"><BadgeCheck className="h-3.5 w-3.5" /> Room paid</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{pass.room_type || 'Your room'}</h2>
        <p className="mt-0.5 text-xs text-neutral-500">{shortDate(pass.check_in)} → {shortDate(pass.check_out)} · {plural(pass.nights, 'night')} · {plural(pass.guests, 'guest')} · {inr(pass.amount)} paid</p>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-3 inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-neutral-700 underline underline-offset-4 hover:text-neutral-950">
          {open ? 'Hide your bill' : 'View your bill'} <ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} />
        </button>
        <p className="mt-2 text-xs text-neutral-500">Food and drinks you order to the room are added to your bill; everything else you have already paid.</p>
      </div>
      {open && (
        <div className="border-t border-neutral-200">
          <ThermalReceiptView invoice={invoice} paymentMethod={`PAID · ${pass.payment_method}`} venue={venue ? { name: venue.name, gstin: venue.gstin || null, address: venue.address || null } : undefined} showPayQr={false} />
        </div>
      )}
    </section>
  );
}
