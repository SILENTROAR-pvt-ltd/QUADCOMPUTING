'use client';

import React from 'react';
import { DynamicUpiQr } from '@/components/host/billing/DynamicUpiQr';
import { ShieldCheck, Copy, Check } from 'lucide-react';

interface Props {
  upiId: string;
  grandTotal: number;
  businessName: string;
  copiedUpi: boolean;
  onCopyUpi: () => void;
}

export function TenderUpiView({
  upiId,
  grandTotal,
  businessName,
  copiedUpi,
  onCopyUpi
}: Props) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="shrink-0 flex items-center justify-center p-3 rounded-2xl border border-zinc-200 bg-zinc-50 shadow-xs">
          <DynamicUpiQr
            upiId={upiId}
            amount={grandTotal}
            businessName={businessName}
            size={150}
          />
        </div>
        <div className="space-y-2.5 text-center sm:text-left flex-1">
          <div>
            <span className="text-xs font-bold text-zinc-900 block">Instant Scan & Pay</span>
            <span className="text-xs text-zinc-500">Scan via GPay, PhonePe, Paytm, or any UPI app</span>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 flex items-center justify-between text-xs">
            <span className="font-mono text-zinc-700">{upiId}</span>
            <button
              type="button"
              onClick={onCopyUpi}
              className="p-1 hover:text-black text-zinc-500 transition-colors cursor-pointer"
              title="Copy UPI VPA"
            >
              {copiedUpi ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Direct merchant settlement enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
}
