'use client';

import React from 'react';
import { Printer, Loader2, Send, Check } from 'lucide-react';
import type { InvoiceData } from '@/lib/utils/receipt-adapter';
import { RoomSettleChoice } from './RoomSettleChoice';
import { CashTenderField } from './CashTenderField';
import type { RoomMode } from './useDigitalReceiptActions';

type Tender = 'UPI' | 'CASH' | 'CARD';

interface Props {
  invoice: InvoiceData;
  paymentMethod: Tender;
  upiConfirmed: boolean;
  isSaving: boolean;
  saveError?: string | null;
  /** A room bill: adjust the payment in the stay, or check the guest out (RoomSettleChoice). */
  roomMode?: RoomMode;
  roomAmount?: number;
  onSetRoomMode?: (m: RoomMode) => void;
  onSetRoomAmount?: (n: number) => void;
  /** Cash: what the guest handed over (null = exact), against what the bill takes now (`due`). */
  cashTendered?: number | null;
  due?: number;
  onSetCashTendered?: (n: number | null) => void;
  onSetPaymentMethod: (pm: Tender) => void;
  onSetUpiConfirmed: (c: boolean) => void;
  onPrint: () => void;
  onSaveOrder: () => void;
  onClose: () => void;
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** The primary button's words: what saving this bill will do. */
export function saveLabel(invoice: InvoiceData, roomMode: RoomMode, roomAmount: number, delivery: boolean): string {
  if (invoice.room_id && invoice.settlement) {
    return roomMode === 'checkout' ? 'Check out & settle' : `Take ${inr(roomAmount)} · adjust in stay`;
  }
  return delivery ? 'Save & send to guest' : 'Save bill';
}

const TENDERS: Array<{ id: Tender; label: string }> = [
  { id: 'UPI', label: 'UPI' },
  { id: 'CASH', label: 'Cash' },
  { id: 'CARD', label: 'Card' },
];

/** Where the bill goes once it is saved. Bills reach the guest on Vibers Connect; there is nothing to type in. */
export function deliveryNote(invoice: InvoiceData): { title: string; hint: string } | null {
  const isCounter = !invoice.table_id && !invoice.room_id && (!invoice.table_number || /takeaway|counter/i.test(invoice.table_number));
  if (isCounter) return null;
  const handle = invoice.guest_handle ? (invoice.guest_handle.startsWith('@') ? invoice.guest_handle : `@${invoice.guest_handle}`) : null;
  return handle
    ? { title: `Sent to ${handle} on Vibers Connect`, hint: 'They can view and download this bill the moment it is saved.' }
    : { title: 'Sent to the guests on Vibers Connect', hint: 'Everyone at this table sees the bill on their phone as soon as it is saved.' };
}

/** Pay-and-save controls under the receipt: how it was paid, one clear primary action, and where the bill goes. */
export function ReceiptModalActions({
  invoice, paymentMethod, upiConfirmed, isSaving, saveError, roomMode = 'payment', roomAmount = invoice.grandTotal,
  onSetRoomMode, onSetRoomAmount, cashTendered = null, due = invoice.grandTotal, onSetCashTendered, onSetPaymentMethod, onSetUpiConfirmed, onPrint, onSaveOrder, onClose,
}: Props) {
  const delivery = deliveryNote(invoice);
  const waitingForUpi = paymentMethod === 'UPI' && !upiConfirmed;
  const cashShort = paymentMethod === 'CASH' && cashTendered !== null && cashTendered + 0.005 < due;
  const roomChoice = Boolean(invoice.room_id && invoice.settlement && !invoice.isReadOnly && onSetRoomMode && onSetRoomAmount);

  if (invoice.isReadOnly) {
    return (
      <div className="flex shrink-0 gap-2 border-t border-neutral-200 bg-white px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] print:hidden">
        <button type="button" onClick={onClose} className="h-12 flex-1 rounded-2xl border border-neutral-200 bg-white text-sm font-semibold text-neutral-700 active:scale-[0.98] cursor-pointer">Close</button>
        <button type="button" onClick={onPrint} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-neutral-900 text-sm font-semibold text-white active:scale-[0.98] cursor-pointer">
          <Printer className="h-4 w-4" aria-hidden /> Print
        </button>
      </div>
    );
  }

  return (
    // The footer never pushes its own Save button off a phone's screen: past two thirds of the viewport it scrolls.
    <div className="max-h-[68dvh] shrink-0 space-y-2.5 overflow-y-auto overscroll-contain border-t border-neutral-200 bg-white px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] shadow-[0_-12px_24px_-18px_rgba(0,0,0,0.25)] print:hidden sm:space-y-3">
      {roomChoice && (
        <RoomSettleChoice billTotal={invoice.grandTotal} mode={roomMode} amount={roomAmount} disabled={isSaving} onMode={onSetRoomMode!} onAmount={onSetRoomAmount!} />
      )}
      <div role="radiogroup" aria-label="How was it paid" className="grid grid-cols-3 gap-1 rounded-2xl bg-neutral-100 p-1">
        {TENDERS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={paymentMethod === t.id}
            disabled={isSaving}
            onClick={() => onSetPaymentMethod(t.id)}
            className={`h-11 rounded-xl text-[13px] font-semibold transition-colors cursor-pointer disabled:opacity-60 ${paymentMethod === t.id ? 'bg-white text-neutral-950 shadow-sm' : 'text-neutral-500 active:bg-white/60'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {paymentMethod === 'CASH' && onSetCashTendered && (
        <CashTenderField due={due} tendered={cashTendered} disabled={isSaving} onChange={onSetCashTendered} />
      )}

      {paymentMethod === 'UPI' && (
        <label className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 active:bg-neutral-100">
          <input
            type="checkbox"
            checked={upiConfirmed}
            disabled={isSaving}
            onChange={(e) => onSetUpiConfirmed(e.target.checked)}
            className="h-5 w-5 shrink-0 cursor-pointer rounded border-neutral-300 accent-neutral-900"
          />
          <span className="text-[13px] font-medium leading-snug text-neutral-800">I have received the UPI payment</span>
        </label>
      )}

      {delivery && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-[#f3f1ea] px-3.5 py-2.5">
          <span aria-hidden className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-neutral-900 text-white"><Check className="h-3 w-3" /></span>
          <p className="min-w-0 text-[12.5px] leading-snug text-neutral-700">
            <span className="block font-semibold text-neutral-900">{delivery.title}</span>
            <span className="hidden sm:inline">{delivery.hint}</span>
          </p>
        </div>
      )}

      {saveError && (
        <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[12.5px] font-medium leading-snug text-rose-700">{saveError}</p>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={onClose} disabled={isSaving} aria-label="Close without saving" className="h-14 rounded-2xl border border-neutral-200 bg-white px-5 text-sm font-semibold text-neutral-700 active:scale-[0.98] disabled:opacity-50 cursor-pointer">
          Back
        </button>
        <button type="button" onClick={onPrint} disabled={isSaving} aria-label="Print bill" className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-neutral-200 bg-white text-neutral-700 active:scale-[0.98] disabled:opacity-50 cursor-pointer">
          <Printer className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onSaveOrder}
          disabled={isSaving || waitingForUpi || cashShort}
          className="inline-flex h-14 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 text-[15px] font-semibold text-white shadow-[0_14px_24px_-14px_rgba(0,0,0,0.6)] transition-all active:scale-[0.99] disabled:bg-neutral-300 disabled:text-neutral-500 disabled:shadow-none cursor-pointer"
        >
          {isSaving
            ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Saving…</>
            : waitingForUpi
              ? 'Confirm UPI to continue'
              : cashShort
                ? 'Cash given is short'
                : <><Send className="h-4 w-4" aria-hidden /> <span className="truncate">{saveLabel(invoice, roomMode, roomAmount, Boolean(delivery))}</span></>}
        </button>
      </div>
    </div>
  );
}
