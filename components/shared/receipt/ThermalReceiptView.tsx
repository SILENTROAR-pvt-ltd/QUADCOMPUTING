'use client';

import React, { useState, useEffect } from 'react';
import type { InvoiceData } from '@/lib/utils/receipt-adapter';
import { DynamicUpiQr } from '@/components/host/billing/DynamicUpiQr';
import { numberToWords } from '@/components/host/workspaces/billing/numberToWords';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';
import { ReceiptBilledTo, discountLabel } from './ReceiptBilledTo';



export interface DigitalReceiptProps {
  invoice: InvoiceData;
  isOnline?: boolean;
  paymentMethod?: string;
  masterUpiHandle?: string;
  businessDisplayName?: string;
  /**
   * Venue identity supplied by the caller (the guest's bill view). When given, the
   * receipt uses it and never loads the host profile.
   */
  venue?: { name: string; gstin: string | null; address: string | null };
  /** Pay-by-UPI QR block. Off for settled bills, where scanning would pay twice. */
  showPayQr?: boolean;
}

export function ThermalReceiptView({
  invoice,
  isOnline = true,
  paymentMethod,
  masterUpiHandle,
  businessDisplayName,
  venue,
  showPayQr = true,
}: DigitalReceiptProps) {
  const propertyBranches = useHostWorkspace((state) => state.propertyBranches);
  const profile = useHostWorkspace((state) => state.profile);
  const primaryBranch = venue ? undefined : propertyBranches[0];

  const [merchantUpi, setMerchantUpi] = useState<string | null>(
    venue ? null : masterUpiHandle || primaryBranch?.upiId || null
  );
  const [merchantName, setMerchantName] = useState<string | null>(
    // The business name — never the owner's personal display name on a tax invoice.
    venue?.name || businessDisplayName || primaryBranch?.name || profile?.legalEntityName || null
  );
  const [merchantGstin, setMerchantGstin] = useState<string | null>(venue ? venue.gstin : primaryBranch?.gstNumber || null);
  const [merchantAddress, setMerchantAddress] = useState<string | null>(venue?.address || null);

  // Venue identity printed on the tax invoice comes only from the venue's own
  // records. There used to be hard-coded fallbacks (a sample address, sample
  // GSTIN/CIN, and a platform UPI id) — printing someone else's GSTIN on a tax
  // invoice, and routing a guest's UPI payment to an account that isn't the
  // venue's. Missing details are now simply omitted.
  useEffect(() => {
    if (venue) return;
    fetch('/api/host/profile', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const biz = data.business || {};
        const loc = data.location || {};
        const fetchedName =
          businessDisplayName ||
          biz.business_name ||
          loc.branch_name ||
          null;
        const address = [loc.address || loc.address_line1 || loc.street, loc.city, loc.state, loc.pincode || loc.postal_code]
          .filter((part) => typeof part === 'string' && part.trim())
          .join(', ');
        if (biz.upi_id) setMerchantUpi(biz.upi_id);
        if (fetchedName) setMerchantName(fetchedName);
        if (biz.gst_number) setMerchantGstin(String(biz.gst_number).toUpperCase());
        if (address) setMerchantAddress(address);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upiId = merchantUpi?.trim() || null;
  const venueName = merchantName || 'Tax Invoice';
  const effectivePayment = paymentMethod || invoice.payment_method || 'SETTLED';

  const discountAmount = invoice.discountAmount || 0;
  const taxableAmount = Math.max(0, invoice.subtotal - discountAmount);
  const taxAmount = invoice.taxAmount || 0;
  const cgst = taxAmount / 2;
  const sgst = taxAmount / 2;
  // Invoice lines don't carry their rate, so derive it: a single-rate bill gets
  // exact labels (e.g. 5% -> CGST 2.5% + SGST 2.5%); a mixed bill (food 5% +
  // services 18%) must not claim one rate — it used to always say 9% + 9%.
  const effectiveRate = taxableAmount > 0 ? (taxAmount / taxableAmount) * 100 : 0;
  const standardRate = [5, 12, 18, 28].find((r) => Math.abs(r - effectiveRate) < 0.05);
  const halfRateLabel = standardRate ? ` (${standardRate / 2}%)` : '';
  const isMixedRate = taxAmount > 0 && !standardRate;

  const hasSections = invoice.items.some((it) => Boolean(it.section));

  const formatSectionLabel = (sec?: string) => {
    switch (sec) {
      case 'ACCOMMODATION':
        return '--- ROOM STAY & TARIFF ---';
      case 'ADD_ON':
        return '--- ADD-ON SERVICES ---';
      case 'ROOM_SERVICE':
        return '--- ROOM SERVICE / F&B ---';
      case 'F&B':
        return '--- FOOD & BEVERAGES ---';
      default:
        return sec ? `--- ${sec.toUpperCase()} ---` : '';
    }
  };

  return (
    <div className="overflow-y-auto p-4 sm:p-8 text-[11px] sm:text-xs print:overflow-visible print:p-2 print:text-[10px] print:w-[80mm] print:max-w-[80mm] print:mx-auto font-mono text-neutral-900 bg-white">
      {/* Offline Mode Alert (Apple monochrome) */}
      {!isOnline && (
        <div className="mb-4 flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-neutral-100 py-2 print:hidden">
          <span className="h-2 w-2 rounded-full bg-neutral-900 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-800">Offline Cash Mode</span>
        </div>
      )}

      {/* Venue Header */}
      <div className="text-center border-b-2 border-dashed border-neutral-400 pb-4 mb-4">
        <h2 className="text-base sm:text-xl font-bold tracking-widest uppercase">
          {venueName}
        </h2>
        {merchantAddress && <p className="mt-1 text-[10px] text-neutral-600">{merchantAddress}</p>}
        {merchantGstin && <p className="break-words text-[10px] text-neutral-600">GSTIN: {merchantGstin}</p>}
      </div>

      {/* Receipt Title */}
      <div className="text-center font-bold tracking-widest uppercase mb-4 text-sm sm:text-base border-b border-dashed border-neutral-300 pb-2">
        TAX INVOICE / CASH MEMO
      </div>

      {/* Meta Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 border-b-2 border-dashed border-neutral-400 pb-4 mb-4">
        <div>
          <p className="font-bold">
            Invoice No:{' '}
            {invoice.id
              ? invoice.id.includes('-')
                ? invoice.id.split('-')[0].toUpperCase()
                : invoice.id.slice(0, 10).toUpperCase()
              : `QC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`}
          </p>
          <p className="text-neutral-600">Order Ref: {invoice.room_id ? 'ACCOM-FOLIO-01' : 'POS-TERM-01'}</p>
          <ReceiptBilledTo invoice={invoice} />
        </div>

        <div className="sm:text-right">
          <p>
            Date:{' '}
            {invoice.created_at
              ? new Date(invoice.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
          <p>
            Time:{' '}
            {invoice.created_at
              ? new Date(invoice.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
              : new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
          </p>
          <p className="mt-1 sm:mt-2">
            <span className="font-bold bg-neutral-100 border border-neutral-300 inline-block px-2 py-0.5 rounded text-[10px] tracking-wider uppercase">
              Status: {effectivePayment}
            </span>
          </p>
        </div>
      </div>

      {/* Itemized Table Header */}
      <div className="mb-2 font-bold tracking-widest uppercase text-center">
        ITEMIZED BREAKDOWN
      </div>

      <div className="border-y-2 border-dashed border-neutral-400 py-2 mb-3 font-bold flex text-[10px] sm:text-xs">
        <div className="w-6 shrink-0">#</div>
        <div className="flex-1 min-w-0">Item Description</div>
        <div className="w-8 shrink-0 text-center">Qty</div>
        <div className="w-16 sm:w-24 shrink-0 text-right">Rate</div>
        <div className="w-16 sm:w-24 shrink-0 text-right">Total</div>
      </div>

      {/* Items List */}
      <div className="space-y-2 min-h-[60px]">
        {invoice.items.map((item, idx) => {
          const prevItem = idx > 0 ? invoice.items[idx - 1] : null;
          const showSectionHeader = hasSections && item.section && (!prevItem || prevItem.section !== item.section);

          return (
            <React.Fragment key={idx}>
              {showSectionHeader && (
                <div className="text-[10px] font-bold text-center tracking-widest uppercase text-neutral-500 py-1 border-t border-dashed border-neutral-200 mt-2">
                  {formatSectionLabel(item.section)}
                </div>
              )}
              <div className="flex items-start">
                <div className="w-6 shrink-0 text-neutral-400">{idx + 1}.</div>
                <div className="flex-1 min-w-0 pr-1">
                  <p className="truncate font-semibold text-neutral-900">{item.name}</p>
                  {item.notes && (
                    <p className="text-[10px] text-neutral-500 italic leading-tight">{item.notes}</p>
                  )}
                </div>
                <div className="w-8 shrink-0 text-center font-bold">{item.qty}</div>
                <div className="w-16 sm:w-24 shrink-0 text-right">{item.price.toFixed(2)}</div>
                <div className="w-16 sm:w-24 shrink-0 text-right font-bold">{(item.price * item.qty).toFixed(2)}</div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Tax & Summary Computation */}
      <div className="mt-6 border-t-2 border-dashed border-neutral-400 pt-3 mb-3">
        <div className="mb-2 font-bold tracking-widest uppercase text-center">
          SUMMARY & COMPUTATION
        </div>
      </div>

      <div className="border-y-2 border-dashed border-neutral-400 py-3 space-y-1.5">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>₹{invoice.subtotal.toFixed(2)}</span>
        </div>

        {discountAmount > 0 && (
          <div className="flex justify-between text-neutral-700">
            <span>{discountLabel(invoice)}</span>
            <span>-₹{discountAmount.toFixed(2)}</span>
          </div>
        )}

        {taxAmount > 0 && (
          <>
            <div className="my-1 border-t border-dashed border-neutral-300 pt-1" />
            <div className="flex justify-between">
              <span>Taxable Amount</span>
              <span>₹{taxableAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>CGST{halfRateLabel}</span>
              <span>₹{cgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>SGST{halfRateLabel}</span>
              <span>₹{sgst.toFixed(2)}</span>
            </div>
            {isMixedRate && (
              <p className="text-[9px] text-neutral-500">GST at item-wise rates (food 5%, services 18%).</p>
            )}
          </>
        )}
      </div>

      {/* Grand Total */}
      <div className="border-b-2 border-dashed border-neutral-400 py-3 flex justify-between font-bold text-base sm:text-lg uppercase tracking-widest">
        <span>GRAND TOTAL</span>
        <span>₹{invoice.grandTotal.toFixed(2)}</span>
      </div>

      {Number(invoice.wallet_cashback) > 0 && (
        <div className="flex justify-between border-b border-dashed border-neutral-300 py-2 text-[10px] text-neutral-700">
          <span>Cashback credited{invoice.guest_handle ? ` to ${invoice.guest_handle}` : ''}</span>
          <span>₹{Number(invoice.wallet_cashback).toFixed(2)}</span>
        </div>
      )}

      {/* Words representation */}
      <div className="mt-3 border-b-2 border-dashed border-neutral-400 pb-3 italic text-[10px]">
        *Amount in Words:* {numberToWords(invoice.grandTotal)}
      </div>

      {/* Dynamic UPI QR Code */}
      {showPayQr && (
      <div className="mt-4 border-b-2 border-dashed border-neutral-400 pb-4 flex flex-col items-center">
        {upiId ? (
          <DynamicUpiQr
            upiId={upiId}
            businessName={venueName}
            amount={invoice.grandTotal}
            orderId={invoice.id}
            size={120}
          />
        ) : (
          <p className="text-[10px] text-neutral-500 text-center print:hidden">
            UPI QR unavailable: add the venue&apos;s UPI ID in My Profile to show a pay-by-UPI code here.
          </p>
        )}
      </div>
      )}

      {/* Terms and conditions */}
      <div className="mt-3 pb-3 text-[10px]">
        <p className="font-bold mb-1.5 uppercase tracking-wider">Terms & Conditions:</p>
        <ol className="list-decimal pl-4 space-y-0.5 text-neutral-600">
          <li>Goods and services once settled will not be exchanged or refunded.</li>
          <li>All hospitality folios and disputes subject to local jurisdiction.</li>
          <li>Thank you for choosing {venueName}. We look forward to your next visit!</li>
        </ol>
      </div>

      <div className="text-center font-bold tracking-widest uppercase border-t-2 border-dashed border-neutral-400 pt-3">
        =================================
      </div>
    </div>
  );
}
