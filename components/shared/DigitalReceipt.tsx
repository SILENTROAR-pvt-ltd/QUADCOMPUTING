'use client';

import React from 'react';
import type { InvoiceData, InvoiceItem } from '@/lib/utils/receipt-adapter';
import { ThermalReceiptView, DigitalReceiptProps } from './receipt/ThermalReceiptView';
import { ReceiptModalActions } from './receipt/ReceiptModalActions';
import { useDigitalReceiptActions, type SaveResult } from './receipt/useDigitalReceiptActions';
import { X } from 'lucide-react';
import { mapFolioToReceipt } from '@/lib/utils/receipt-adapter';

export type { InvoiceData, InvoiceItem, DigitalReceiptProps };
export { ThermalReceiptView as DigitalReceipt, mapFolioToReceipt };

export interface DigitalReceiptModalProps {
  /** The canonical invoice payload containing line items, totals, and folio metadata */
  invoice: InvoiceData;
  /** Controls modal presentation visibility (defaults to true) */
  isOpen?: boolean;
  /** Invoked when dismissing the receipt modal */
  onClose: () => void;
  /** Optional callback after successfully recording and settling order in database; receives the tender used */
  onSuccess?: (paymentMethod: 'UPI' | 'CASH' | 'CARD', result: SaveResult) => void | Promise<void>;
}

/**
 * DigitalReceiptModal
 * 
 * Production-grade Apple light theme digital receipt modal.
 * Adheres strictly to zero dark card policies (bg-white, border-neutral-200, shadow-2xl).
 */
export function DigitalReceiptModal({
  invoice,
  isOpen = true,
  onClose,
  onSuccess,
}: DigitalReceiptModalProps) {
  const {
    paymentMethod,
    setPaymentMethod,
    upiConfirmed,
    setUpiConfirmed,
    roomMode,
    setRoomMode,
    roomAmount,
    setRoomAmount,
    isSaving,
    saveError,
    isOnline,
    handlePrint,
    handleSaveOrder,
  } = useDigitalReceiptActions(invoice, onSuccess);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Digital Receipt & POS Folio"
      onClick={() => { if (!isSaving) onClose(); }}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 sm:items-center sm:p-4 print:bg-white print:p-0 animate-in fade-in duration-150"
    >
      {/* A sheet from the bottom on a phone, a centred card on a desktop. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex w-full max-w-2xl flex-col ${invoice.isReadOnly ? 'max-h-[96dvh]' : 'h-[94dvh]'} sm:h-auto overflow-hidden rounded-t-[28px] bg-white text-neutral-900 shadow-2xl sm:max-h-[92dvh] sm:rounded-3xl print:h-auto print:max-h-none print:w-full print:max-w-full print:rounded-none print:shadow-none animate-in slide-in-from-bottom-6 duration-200 sm:slide-in-from-bottom-0`}
      >
        {!invoice.isReadOnly && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-100 px-4 pb-3 pt-3.5 print:hidden">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Review bill{invoice.table_number ? ` · ${invoice.table_number}` : ''}</p>
              <p className="mt-0.5 font-mono text-[22px] font-semibold leading-none tracking-tight text-neutral-950">₹{invoice.grandTotal.toFixed(2)}</p>
            </div>
            <button type="button" onClick={onClose} disabled={isSaving} aria-label="Close" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-neutral-100 text-neutral-600 active:scale-95 disabled:opacity-40 cursor-pointer">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}

        {/* Printable Thermal Receipt Body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white">
          <ThermalReceiptView
            invoice={invoice}
            isOnline={isOnline}
            paymentMethod={paymentMethod}
            showPayQr={!invoice.isReadOnly}
          />
        </div>

        {/* Action Controls Footer */}
        <ReceiptModalActions
          invoice={invoice}
          paymentMethod={paymentMethod}
          upiConfirmed={upiConfirmed}
          isSaving={isSaving}
          saveError={saveError}
          roomMode={roomMode}
          roomAmount={roomAmount}
          onSetRoomMode={setRoomMode}
          onSetRoomAmount={setRoomAmount}
          onSetPaymentMethod={setPaymentMethod}
          onSetUpiConfirmed={setUpiConfirmed}
          onPrint={handlePrint}
          onSaveOrder={handleSaveOrder}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
