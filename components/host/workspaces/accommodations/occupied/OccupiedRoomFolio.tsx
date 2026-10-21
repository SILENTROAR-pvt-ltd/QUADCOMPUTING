'use client';

import React from 'react';
import { HandCoins, LogOut, Printer, Receipt } from 'lucide-react';
import type { FolioLine } from '@/lib/services/accommodation/stay-folio.util';
import type { BillingSummary } from './useOccupiedRoomDossier';

interface Props {
  billingSummary: BillingSummary;
  folioLines?: FolioLine[];
  ordersCount: number;
  onPrintFolio: () => void;
  onOpenSettlement: () => void;
  /** Take some or all of what is owed now, without checking out. */
  onTakePayment?: () => void;
  isCheckingOut: boolean;
}

const money = (n: number) => `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Row({ label, note, value, strong }: { label: string; note?: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="min-w-0">
        <span className={strong ? 'font-semibold text-neutral-950' : 'text-neutral-800'}>{label}</span>
        {note && <span className="block text-[11px] text-neutral-500">{note}</span>}
      </span>
      <span className={`shrink-0 font-mono tabular-nums ${strong ? 'font-semibold text-neutral-950' : 'text-neutral-900'}`}>{money(value)}</span>
    </div>
  );
}

/** The running bill if the guest checked out now, and the checkout action that hands it to billing. */
export function OccupiedRoomFolio({ billingSummary: b, folioLines = [], ordersCount, onPrintFolio, onOpenSettlement, onTakePayment, isCheckingOut }: Props) {
  const stayed = b.nightsStayed ?? b.nights;
  const booked = b.bookedNights && stayed < b.bookedNights
    ? `Booked for ${b.bookedNights} night${b.bookedNights === 1 ? '' : 's'}, ${stayed} stayed so far: billed for the nights booked.`
    : b.bookedNights && b.nights > b.bookedNights ? `Booked for ${b.bookedNights}, staying ${b.nights}: billed for the nights stayed.` : null;
  return (
    <section aria-label="Folio" className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
      <div className="flex items-baseline justify-between border-b border-neutral-200 pb-2.5">
        <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500"><Receipt className="h-4 w-4" />Folio</h3>
        <span className="text-[11px] text-neutral-500">If checked out now · {b.nights} night{b.nights === 1 ? '' : 's'}</span>
      </div>

      <div className="divide-y divide-neutral-100 text-sm">
        {folioLines.length > 0
          ? folioLines.map((l) => <Row key={l.id} label={l.name} note={l.notes} value={l.price * l.qty} />)
          : <Row label={`Room (${b.nights} × ${money(b.roomRate)})`} value={b.roomTariffSubtotal} />}
        {folioLines.length === 0 && b.addonsSubtotal > 0 && <Row label="Add-ons" value={b.addonsSubtotal} />}
        <Row label={`Room service (${ordersCount} order${ordersCount === 1 ? '' : 's'})`} note={ordersCount ? undefined : 'Nothing charged to the room yet'} value={b.ordersSubtotal} />
        {Number(b.advancePaid) > 0 && <Row label="Paid so far" note="Taken before check-in or during the stay" value={-Number(b.advancePaid)} />}
      </div>

      <div className="mt-2 flex items-baseline justify-between border-t border-neutral-900 pt-3">
        <span className="text-sm font-semibold text-neutral-950">{Number(b.advancePaid) > 0 ? 'Balance due' : 'Total due'}</span>
        <span className="font-serif text-2xl tabular-nums text-neutral-950">{money(b.grandTotalPayable)}</span>
      </div>
      {booked && <p className="mt-1 text-[11px] text-neutral-500">{booked}</p>}
      {Number(b.refundDue) > 0 && <p role="status" className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">Paid {money(Number(b.refundDue))} more than the stay comes to so far; return it to the guest at checkout.</p>}
      <p className="mt-1 text-[11px] text-neutral-500">Taxes and the tender are applied in billing after checkout.</p>

      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
        <button type="button" onClick={onPrintFolio} aria-label="Print interim folio" className="flex h-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 cursor-pointer">
          <Printer className="h-4 w-4" /><span className="sm:hidden">Print folio</span>
        </button>
        {onTakePayment && b.grandTotalPayable > 0 && (
          <button type="button" onClick={onTakePayment} disabled={isCheckingOut} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50 cursor-pointer">
            <HandCoins className="h-4 w-4" /> Take payment now
          </button>
        )}
        <button type="button" onClick={onOpenSettlement} disabled={isCheckingOut}
          className="flex h-11 flex-[2] items-center justify-center gap-2 rounded-xl bg-neutral-950 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 cursor-pointer">
          {isCheckingOut
            ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Checking out…</>
            : <><LogOut className="h-4 w-4" /> Check out &amp; bill {money(b.grandTotalPayable)}</>}
        </button>
      </div>
    </section>
  );
}
