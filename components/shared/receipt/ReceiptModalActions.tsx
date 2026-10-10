'use client';

import React from 'react';
import { Mail, MessageSquare, Printer, CheckCircle2 } from 'lucide-react';
import type { InvoiceData } from '@/lib/utils/receipt-adapter';

interface Props {
  invoice: InvoiceData;
  paymentMethod: 'UPI' | 'CASH' | 'CARD';
  upiConfirmed: boolean;
  isSaving: boolean;
  onSetPaymentMethod: (pm: 'UPI' | 'CASH' | 'CARD') => void;
  onSetUpiConfirmed: (c: boolean) => void;
  onShareEmail: () => void;
  onShareSMS: () => void;
  onPrint: () => void;
  onSaveOrder: () => void;
  onClose: () => void;
}

export function ReceiptModalActions({
  invoice, paymentMethod, upiConfirmed, isSaving,
  onSetPaymentMethod, onSetUpiConfirmed,
  onShareEmail, onShareSMS, onPrint, onSaveOrder, onClose,
}: Props) {
  const pmOptions: Array<'UPI' | 'CASH' | 'CARD'> = ['UPI', 'CASH', 'CARD'];
  return (
    <div className="border-t border-neutral-200 bg-neutral-50 p-4 flex flex-col gap-3 print:hidden shrink-0">
      {!invoice.isReadOnly && (
        <>
          <div className="flex bg-neutral-200/80 rounded-xl p-1 border border-neutral-200 shadow-2xs">
            {pmOptions.map((pm) => (
              <button
                key={pm}
                type="button"
                onClick={() => onSetPaymentMethod(pm)}
                className={`flex-1 rounded-lg py-2 text-xs font-bold tracking-wider transition-colors cursor-pointer ${
                  paymentMethod === pm ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {pm}
              </button>
            ))}
          </div>

          {paymentMethod === 'UPI' && (
            <label className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 cursor-pointer transition-colors hover:bg-neutral-50">
              <input
                type="checkbox"
                checked={upiConfirmed}
                onChange={(e) => onSetUpiConfirmed(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-neutral-900 accent-neutral-900 cursor-pointer"
              />
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-800">
                Confirm UPI Payment Received via Soundbox / SMS
              </span>
            </label>
          )}
        </>
      )}

      <div className="flex w-full gap-2">
        <button type="button" onClick={onShareEmail} className="flex-1 h-10 rounded-xl border border-neutral-200 bg-white px-4 text-xs font-bold uppercase tracking-wider text-neutral-700 hover:bg-neutral-100 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs">
          <Mail className="h-3.5 w-3.5 text-neutral-500" />
          <span>Email</span>
        </button>
        <button type="button" onClick={onShareSMS} className="flex-1 h-10 rounded-xl border border-neutral-200 bg-white px-4 text-xs font-bold uppercase tracking-wider text-neutral-700 hover:bg-neutral-100 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs">
          <MessageSquare className="h-3.5 w-3.5 text-neutral-500" />
          <span>SMS</span>
        </button>
      </div>

      <div className="flex w-full gap-2">
        <button type="button" onClick={onClose} disabled={isSaving} className="flex-1 h-10 rounded-xl border border-neutral-200 bg-white px-4 text-xs font-bold uppercase tracking-wider text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 cursor-pointer shadow-2xs">
          Close
        </button>
        <button type="button" onClick={onPrint} disabled={isSaving} className="flex-1 h-10 rounded-xl border border-neutral-200 bg-white px-4 text-xs font-bold uppercase tracking-wider text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs">
          <Printer className="h-3.5 w-3.5 text-neutral-500" />
          <span>Print</span>
        </button>
        {!invoice.isReadOnly && (
          <button
            type="button"
            onClick={onSaveOrder}
            disabled={isSaving || (paymentMethod === 'UPI' && !upiConfirmed)}
            className="flex-[2] h-10 rounded-xl bg-neutral-900 px-6 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-neutral-800 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            {isSaving ? 'Saving Order...' : paymentMethod === 'UPI' && !upiConfirmed ? 'Awaiting UPI Confirmation' : (
              <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /><span>Save Order</span></>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
