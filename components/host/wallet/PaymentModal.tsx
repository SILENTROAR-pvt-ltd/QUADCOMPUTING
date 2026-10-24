'use client';

import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, ShieldCheck, Loader2 } from 'lucide-react';
import { usePaymentForm, upiLink } from './hooks/usePaymentForm';
import type { PaymentTarget, PlatformPayment } from './hooks/useWalletWorkspace';
import { VIBEY_ADDON } from '@/lib/services/wallet/plans';

interface Props {
  venueId: string;
  target: PaymentTarget | null;
  payment: PlatformPayment | null;
  onClose: () => void;
  onSubmitted: () => void;
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const input = 'w-full h-11 px-3.5 rounded-xl border border-neutral-200 bg-white font-mono text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/5 placeholder:text-neutral-400';

/** Pay the platform by UPI, then file the payment's UTR so the team can verify and apply it. */
export function PaymentModal({ venueId, target, payment, onClose, onSubmitted }: Props) {
  const f = usePaymentForm(venueId, target, () => { onSubmitted(); onClose(); });
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [target, onClose]);
  if (!target) return null;

  // A plan or the add-on has a fixed price; only a top-up amount is typed.
  const isPlan = target.kind !== 'topup';
  const setup = target.kind === 'plan' ? target.setup ?? 0 : 0;
  const title = target.kind === 'plan' ? target.plan.name : target.kind === 'addon' ? VIBEY_ADDON.name : 'Add wallet credit';
  const note = isPlan ? `Vibers ${title}` : 'Vibers wallet top-up';
  const planNote = target.kind === 'plan'
    ? `${target.plan.termMonths} months${setup ? `, plus the one-time ₹${setup} setup` : ''}. Starts when your payment is verified.`
    : `Vibey for ${VIBEY_ADDON.termMonths} months on top of your plan. Switches on when your payment is verified.`;
  const copy = async () => {
    if (!payment) return;
    try { await navigator.clipboard.writeText(payment.upi_id); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-neutral-950/50 backdrop-blur-[2px] p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white border border-neutral-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-neutral-100">
          <div>
            <h3 className="font-serif text-lg font-medium text-neutral-900">{title}</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              {isPlan ? planNote : f.setup
                ? `Your first top-up includes the one-time ₹${f.setup} setup; the rest becomes credit for the ₹3 bill fees.`
                : 'Credit pays the ₹3 per-bill fees. Added once your payment is verified.'}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={f.submit} className="px-6 py-5 space-y-5">
          <div className="grid sm:grid-cols-[auto_1fr] gap-5 items-center">
            <div className="mx-auto rounded-2xl border border-neutral-200 p-3 bg-white">
              {payment && f.amountOk
                ? <QRCodeSVG value={upiLink(payment, f.amount, note)} size={148} level="M" fgColor="#0a0a0a" />
                : <div className="w-[148px] h-[148px] grid place-items-center text-[11px] text-neutral-400 text-center px-4">Enter a valid amount to see the QR</div>}
            </div>
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">1 · Scan or pay to UPI ID</p>
              <div className="flex items-center gap-2 rounded-xl bg-neutral-50 border border-neutral-200 px-3 py-2">
                <span className="font-mono text-xs font-semibold text-neutral-900 truncate flex-1">{payment?.upi_id || 'Loading…'}</span>
                <button type="button" onClick={copy} disabled={!payment} className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-600 hover:text-neutral-900">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}{copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              {payment && <p className="text-[11px] text-neutral-500">Payee: <span className="font-medium text-neutral-800">{payment.payee_name}</span></p>}
              {isPlan ? (
                <p className="text-2xl font-semibold tabular-nums text-neutral-900">{inr(f.amount)}</p>
              ) : (
                <label className="block">
                  <span className="text-[11px] text-neutral-500">Amount (₹)</span>
                  <input type="number" inputMode="decimal" min={f.min} max={100000} step="1" value={f.amountText} onChange={(e) => f.setAmountText(e.target.value)} className={`${input} mt-1`} />
                  {f.setup > 0 && f.amountOk && <span className="mt-1 block text-[11px] text-neutral-500">₹{f.setup} setup + {inr(f.amount - f.setup)} credit</span>}
                </label>
              )}
            </div>
          </div>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">2 · Enter the UTR / reference from your payment app</span>
            <input autoComplete="off" inputMode="text" maxLength={26} placeholder="12-digit UPI reference, e.g. 427819034521" value={f.utr} onChange={(e) => f.setUtr(e.target.value)} className={`${input} mt-1.5`} />
          </label>

          {f.error && <p role="alert" className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">{f.error}</p>}

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="flex items-center gap-1.5 text-[11px] text-neutral-500"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />Checked against the bank before it is applied</p>
            <button type="submit" disabled={f.submitting} className="inline-flex items-center gap-1.5 h-10 px-5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-semibold disabled:opacity-50 shrink-0">
              {f.submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{f.submitting ? 'Submitting…' : 'Submit payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
