'use client';

import React, { useEffect } from 'react';
import { Printer, X } from 'lucide-react';
import { ThermalReceiptView } from '@/components/shared/receipt/ThermalReceiptView';
import type { GuestInvoice } from '@/lib/services/guest-auth/guest-bills.service';

const inr = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const when = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const LEDGER_LABEL: Record<string, string> = { CASHBACK: 'Cashback credited', REDEMPTION: 'Wallet used on this bill', ADJUSTMENT: 'Adjustment' };

// Print only the receipt, not the rest of the guest app.
const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #guest-invoice-print, #guest-invoice-print * { visibility: visible !important; }
  #guest-invoice-print { position: absolute !important; left: 0; top: 0; width: 100%; max-height: none !important; overflow: visible !important; }
}`;

/** One bill: the receipt the host prints, the venue it was paid at, and the wallet entries it produced. */
export function GuestInvoiceSheet({ invoice, onClose }: { invoice: GuestInvoice; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Invoice ${invoice.invoice_no} at ${invoice.venue_name}`}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full sm:max-w-2xl max-h-[92vh] flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between gap-4 border-b border-neutral-100 px-5 py-3.5 print:hidden">
          <div className="min-w-0">
            <p className="truncate font-serif text-lg text-neutral-950">Invoice #{invoice.invoice_no}</p>
            <p className="truncate text-xs text-neutral-500">{invoice.venue_name} · {when(invoice.created_at)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close invoice" className="rounded-full p-2 hover:bg-neutral-100 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div id="guest-invoice-print">
            <ThermalReceiptView invoice={invoice.invoice} venue={invoice.venue} showPayQr={false} isOnline />
          </div>

          {/* What this bill did to the guest's wallets */}
          <section className="px-5 sm:px-6 pb-5 print:hidden" aria-label="Wallet activity for this bill">
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Wallet activity for this bill</p>
              {invoice.ledger.length === 0 ? (
                <p className="mt-2 text-xs text-neutral-500">No wallet activity on this bill. Cashback was not credited to a wallet.</p>
              ) : (
                <ul className="mt-2 divide-y divide-neutral-200">
                  {invoice.ledger.map((e) => {
                    const credit = e.transaction_type === 'CASHBACK' || (e.transaction_type === 'ADJUSTMENT' && e.amount > 0);
                    return (
                      <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                        <div className="min-w-0">
                          <p className="font-medium text-neutral-900">{LEDGER_LABEL[e.transaction_type] ?? e.transaction_type}</p>
                          <p className="truncate text-[11px] text-neutral-500">
                            Wallet {e.wallet_code ?? '—'} · {e.venue_name} · balance after {inr(e.balance_after)}
                          </p>
                        </div>
                        <p className={`shrink-0 font-semibold ${credit ? 'text-emerald-700' : 'text-neutral-900'}`}>
                          {credit ? '+' : '−'}{inr(Math.abs(e.amount))}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="mt-3 text-[11px] text-neutral-500">
                Paid {inr(invoice.grand_total)} at {invoice.venue_name}
                {invoice.payment_method && invoice.payment_method !== 'SETTLED' ? ` by ${invoice.payment_method}` : ''}
                {invoice.cashback > 0 && invoice.cashback_wallet_code
                  ? ` · cashback ${inr(invoice.cashback)} to wallet ${invoice.cashback_wallet_code}`
                  : ''}.
              </p>
            </div>
          </section>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-100 px-5 py-3 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-neutral-200 px-4 py-2.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-50 cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" /> Print / save PDF
          </button>
          <button type="button" onClick={onClose} className="rounded-2xl bg-neutral-950 px-4 py-2.5 text-xs font-semibold text-white hover:bg-neutral-800 cursor-pointer">
            Close
          </button>
        </div>
        <style>{PRINT_CSS}</style>
      </div>
    </div>
  );
}

export default GuestInvoiceSheet;
