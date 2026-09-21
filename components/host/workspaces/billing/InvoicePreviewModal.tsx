'use client';

import { useState } from 'react';

export interface InvoiceData {
  items: Array<{ id: string; name: string; price: number; qty: number }>;
  subtotal: number;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  isReadOnly?: boolean; // Used when viewing historical orders
}

interface Props {
  invoice: InvoiceData;
  onClose: () => void;
  onSuccess?: () => void;
}

// Utility to convert numbers to words (Indian Numbering System)
function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const inWords = (n: number) => {
    let str = '';
    if (n > 99) {
      str += a[Math.floor(n / 100)] + 'Hundred ';
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += a[Math.floor(n)];
    }
    return str.trim();
  };

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  let out = '';
  if (rupees > 99999) {
    out += inWords(Math.floor(rupees / 100000)) + ' Lakh ';
  }
  let rem = rupees % 100000;
  if (rem > 999) {
    out += inWords(Math.floor(rem / 1000)) + ' Thousand ';
  }
  rem %= 1000;
  if (rem > 0) {
    out += inWords(rem);
  }

  let finalStr = out.trim() + ' Rupees';
  if (paise > 0) {
    finalStr += ' and ' + inWords(paise) + ' Paise';
  }
  return finalStr + ' Only.';
}

export function InvoicePreviewModal({ invoice, onClose, onSuccess }: Props) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (invoice.isReadOnly || !onSuccess) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/host/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoice),
      });
      if (res.ok) {
        onSuccess();
      } else {
        alert('Failed to save order to Supabase.');
      }
    } catch (e) {
      alert('Error saving order.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareEmail = () => {
    prompt("Enter client's email address to send the receipt:");
  };

  const handleShareSMS = () => {
    prompt("Enter client's phone number to send the receipt link:");
  };

  const taxableAmount = Math.max(0, invoice.subtotal - invoice.discountAmount);
  const cgst = invoice.taxAmount / 2;
  const sgst = invoice.taxAmount / 2;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-sm print:bg-white print:p-0">
      <div className="flex w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex-col overflow-hidden bg-white text-zinc-950 shadow-2xl animate-in zoom-in-95 duration-200 print:shadow-none print:w-full print:max-w-full print:max-h-none font-mono">
        
        <div className="overflow-y-auto p-4 sm:p-8 text-[10px] sm:text-xs print:overflow-visible print:p-4">
          
          <div className="text-center border-b-2 border-dashed border-zinc-400 pb-4 mb-4">
            <h2 className="text-base sm:text-xl font-bold tracking-widest uppercase">Quad Computing Venue</h2>
            <p className="mt-1">123 Enterprise Avenue, Tech City, India</p>
            <p className="break-words">GSTIN: 22AAAAA0000A1Z5</p>
            <p className="hidden sm:block">CIN: U72900PB2026PTC00000</p>
          </div>

          <div className="text-center font-bold tracking-widest uppercase mb-4 text-sm">
            TAX INVOICE / CASH MEMO
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 border-b-2 border-dashed border-zinc-400 pb-4 mb-4">
            <div>
              <p>Invoice No: QC-{new Date().getFullYear()}-{Math.floor(1000 + Math.random() * 9000)}</p>
              <p>Order Ref: POS-TERM-01</p>
              <p className="mt-1 sm:mt-2">Billed To: Walk-in Client</p>
            </div>
            <div className="sm:text-right">
              <p>Date: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              <p>Time: {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
              <p className="mt-1 sm:mt-2">Payment: UPI / Card</p>
            </div>
          </div>

          <div className="mb-2 font-bold tracking-widest uppercase text-center">ITEMIZED BREAKDOWN</div>
          
          <div className="border-y-2 border-dashed border-zinc-400 py-2 mb-4 font-bold flex">
            <div className="w-6 shrink-0">#</div>
            <div className="flex-1 min-w-0">Item</div>
            <div className="w-8 shrink-0 text-center">Qty</div>
            <div className="w-16 sm:w-24 shrink-0 text-right">Rate</div>
            <div className="w-16 sm:w-24 shrink-0 text-right">Total</div>
          </div>

          <div className="space-y-2 min-h-[80px]">
            {invoice.items.map((item, idx) => (
              <div key={idx} className="flex">
                <div className="w-6 shrink-0">{idx + 1}.</div>
                <div className="flex-1 min-w-0 truncate pr-1">{item.name}</div>
                <div className="w-8 shrink-0 text-center">{item.qty}</div>
                <div className="w-16 sm:w-24 shrink-0 text-right">{item.price.toFixed(2)}</div>
                <div className="w-16 sm:w-24 shrink-0 text-right">{(item.price * item.qty).toFixed(2)}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t-2 border-dashed border-zinc-400 pt-4 mb-4">
            <div className="mb-2 font-bold tracking-widest uppercase text-center">SUMMARY & TAX COMPUTATION</div>
          </div>

          <div className="border-y-2 border-dashed border-zinc-400 py-4 space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₹{invoice.subtotal.toFixed(2)}</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between">
                <span>Discount ({invoice.discountType === 'percentage' ? `${invoice.discountValue}% Promotional` : `Flat ₹${invoice.discountValue}`})</span>
                <span>-₹{invoice.discountAmount.toFixed(2)}</span>
              </div>
            )}
            
            <div className="my-2 border-t border-dashed border-zinc-300 pt-2" />

            <div className="flex justify-between">
              <span>Taxable Amount</span>
              <span>₹{taxableAmount.toFixed(2)}</span>
            </div>
            {invoice.taxAmount > 0 && (
              <>
                <div className="flex justify-between">
                  <span>CGST (9% on ₹{taxableAmount.toFixed(2)})</span>
                  <span>₹{cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST (9% on ₹{taxableAmount.toFixed(2)})</span>
                  <span>₹{sgst.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>

          <div className="border-b-2 border-dashed border-zinc-400 py-3 flex justify-between font-bold text-lg uppercase tracking-widest">
            <span>GRAND TOTAL</span>
            <span>₹{invoice.grandTotal.toFixed(2)}</span>
          </div>

          <div className="mt-4 border-b-2 border-dashed border-zinc-400 pb-4 italic">
            *Amount in Words:* {numberToWords(invoice.grandTotal)}
          </div>

          <div className="mt-4 pb-4">
            <p className="font-bold mb-2">TERMS & CONDITIONS:</p>
            <ol className="list-decimal pl-4 space-y-1 text-[10px]">
              <li>Goods once sold/served will not be taken back or exchanged.</li>
              <li>All disputes are subject to local jurisdiction.</li>
              <li>Thank you for visiting Quad Computing Venue. Have a great day!</li>
            </ol>
          </div>

          <div className="text-center font-bold tracking-widest uppercase border-t-2 border-dashed border-zinc-400 pt-4">
            =================================
          </div>
        </div>

        <div className="border-t border-zinc-200 bg-zinc-100 p-4 flex flex-col gap-3 print:hidden shrink-0 font-sans">
          <div className="flex w-full gap-2">
            <button onClick={handleShareEmail} className="flex-1 rounded border border-zinc-300 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-black shadow-sm transition-all hover:bg-zinc-50">
              Email
            </button>
            <button onClick={handleShareSMS} className="flex-1 rounded border border-zinc-300 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-black shadow-sm transition-all hover:bg-zinc-50">
              SMS
            </button>
          </div>

          <div className="flex w-full gap-2">
            <button onClick={onClose} disabled={isSaving} className="rounded px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-600 hover:bg-zinc-200 disabled:opacity-50 flex-1 transition-colors">
              Close
            </button>
            <button onClick={handlePrint} disabled={isSaving} className="flex-1 rounded border border-zinc-300 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-black shadow-sm transition-all hover:bg-zinc-50 disabled:opacity-50">
              Print
            </button>
            {!invoice.isReadOnly && (
              <button onClick={handleSave} disabled={isSaving} className="flex-[2] rounded bg-black px-6 py-2 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-zinc-800 disabled:opacity-50 flex items-center justify-center gap-2">
                {isSaving && <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>}
                {isSaving ? 'Saving...' : 'Save Order'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
