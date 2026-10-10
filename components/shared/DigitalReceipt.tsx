'use client';

import React from 'react';
import type { InvoiceData, InvoiceItem } from '@/lib/utils/receipt-adapter';
import { ThermalReceiptView, DigitalReceiptProps } from './receipt/ThermalReceiptView';
import { ReceiptModalActions } from './receipt/ReceiptModalActions';
import { useDigitalReceiptActions } from './receipt/useDigitalReceiptActions';
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
  onSuccess?: (paymentMethod: 'UPI' | 'CASH' | 'CARD') => void;
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
    isSaving,
    isOnline,
    handlePrint,
    handleShareEmail,
    handleShareSMS,
    handleSaveOrder,
  } = useDigitalReceiptActions(invoice, onSuccess);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Digital Receipt & POS Folio"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-2 sm:p-4 backdrop-blur-sm print:bg-white print:p-0 animate-in fade-in duration-200"
    >
      <div className="flex w-full max-w-2xl max-h-[95vh] sm:max-h-[92vh] flex-col overflow-hidden bg-white text-neutral-900 shadow-2xl rounded-2xl sm:rounded-3xl print:rounded-none print:shadow-none print:w-full print:max-w-full print:max-h-none border border-neutral-200">
        {/* Printable Thermal Receipt Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
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
          onSetPaymentMethod={setPaymentMethod}
          onSetUpiConfirmed={setUpiConfirmed}
          onShareEmail={handleShareEmail}
          onShareSMS={handleShareSMS}
          onPrint={handlePrint}
          onSaveOrder={handleSaveOrder}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
