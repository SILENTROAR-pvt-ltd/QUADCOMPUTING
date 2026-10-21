'use client';

import React from 'react';
import { Banknote, CreditCard, Smartphone } from 'lucide-react';
import { DynamicUpiQr } from '@/components/host/billing/DynamicUpiQr';
import type { Quote, Tender } from './useCollect';

const TENDERS: Array<{ id: Tender; label: string; Icon: typeof Banknote }> = [
  { id: 'UPI', label: 'UPI', Icon: Smartphone }, { id: 'CASH', label: 'Cash', Icon: Banknote }, { id: 'CARD', label: 'Card', Icon: CreditCard },
];
const money = (n: number) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;

interface Props {
  quote: Quote; tender: Tender; reference: string; received: boolean; busy: boolean; error: string | null; upiId: string | null; businessName: string; code: string;
  onTender: (t: Tender) => void; onReference: (v: string) => void; onReceived: (v: boolean) => void; onBack: () => void; onConfirm: () => void;
}

/**
 * The guest pays the venue directly, the way a table bill is paid: UPI shows the venue's QR for the exact amount, or
 * cash, or card. Nothing is recorded until the desk confirms the money has arrived, and a UPI or card payment must
 * carry its bank reference so it can be matched to a statement later.
 */
export function PayStep({ quote, tender, reference, received, busy, error, upiId, businessName, code, onTender, onReference, onReceived, onBack, onConfirm }: Props) {
  const needsRef = tender !== 'CASH';
  const ok = received && (!needsRef || reference.trim().length >= 4);
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between rounded-2xl bg-neutral-950 px-5 py-4 text-white">
        <span className="text-xs font-semibold uppercase tracking-wider text-white/70">Amount</span>
        <span className="font-serif text-3xl tabular-nums">{money(quote.amount)}</span>
      </div>

      <div role="tablist" aria-label="How the guest pays" className="grid grid-cols-3 gap-2">
        {TENDERS.map(({ id, label, Icon }) => (
          <button key={id} type="button" role="tab" aria-selected={tender === id} onClick={() => onTender(id)}
            className={`flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition ${tender === id ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400'}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tender === 'UPI' && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          {upiId ? (
            <div className="flex justify-center"><DynamicUpiQr upiId={upiId} businessName={businessName} amount={quote.amount} orderId={code} size={190} /></div>
          ) : (
            <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">This venue has no UPI ID saved, so there is no QR to show. Add it under Profile, or take cash or card.</p>
          )}
          <p className="mt-3 text-center text-[11px] text-neutral-500">The money goes straight to {businessName}. Check it in your UPI app before confirming.</p>
        </div>
      )}

      {needsRef && (
        <div>
          <label htmlFor="pay-ref" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-neutral-500">{tender === 'UPI' ? 'UPI reference (UTR)' : 'Card approval code'}</label>
          <input id="pay-ref" value={reference} onChange={(e) => onReference(e.target.value.slice(0, 40))} autoComplete="off" placeholder={tender === 'UPI' ? 'From the payment screen or your bank app' : 'From the card slip'}
            className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3.5 font-mono text-sm text-neutral-900 outline-none focus:border-neutral-900" />
        </div>
      )}

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 bg-white p-3.5 text-sm text-neutral-800">
        <input type="checkbox" checked={received} onChange={(e) => onReceived(e.target.checked)} className="mt-0.5 h-4 w-4 accent-neutral-950" />
        <span>I have received {money(quote.amount)}{tender === 'UPI' ? ' in the UPI account' : tender === 'CARD' ? ' on the card machine' : ' in cash'}.</span>
      </label>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800">{error}</p>}
      <div className="flex gap-3">
        <button type="button" onClick={onBack} disabled={busy} className="h-12 flex-1 cursor-pointer rounded-xl border border-neutral-200 bg-white text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50">Back</button>
        <button type="button" onClick={onConfirm} disabled={!ok || busy} className="h-12 flex-[2] cursor-pointer rounded-xl bg-neutral-950 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40">
          {busy ? 'Recording…' : 'Payment received · generate bill'}
        </button>
      </div>
    </div>
  );
}
