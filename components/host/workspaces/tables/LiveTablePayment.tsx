'use client';

import React, { useState } from 'react';
import { Banknote, CheckCircle2, CreditCard, Loader2, Smartphone } from 'lucide-react';
import type { BillPayment } from '@/lib/services/payments/bill-payment.rules';
import { inr } from './LiveTableLine';

const ICON = { UPI: Smartphone, CASH: Banknote, CARD: CreditCard } as const;
const WORD = { UPI: 'UPI', CASH: 'cash', CARD: 'card' } as const;

const clock = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : null);

interface LiveTablePaymentProps {
  payment: BillPayment;
  /** Confirms the money was received; resolves false when it could not be saved. */
  onVerify: (id: string) => Promise<boolean>;
}

/**
 * How this table said it will pay, and the waiter's one action: confirm the money is in. For UPI that is after the guest says they
 * have paid and the waiter has seen the success screen. Confirming does not settle: billing does that.
 */
export function LiveTablePayment({ payment, onVerify }: LiveTablePaymentProps) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const Icon = ICON[payment.method];
  const word = WORD[payment.method];
  const claimedAt = clock(payment.claimed_at);

  const verify = async () => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    const ok = await onVerify(payment.id);
    setBusy(false);
    if (!ok) setFailed(true);
  };

  if (payment.status === 'verified') {
    return (
      <p role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[13px] font-medium leading-snug text-emerald-900">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>{inr(payment.amount)} confirmed by {word}. Billing can settle this table.</span>
      </p>
    );
  }

  const claimed = payment.status === 'claimed';
  const waitingOnGuest = payment.method === 'UPI' && !claimed;

  return (
    <section aria-label="Payment for this table" className={`rounded-xl border px-3 py-2.5 ${claimed ? 'border-amber-300 bg-amber-50' : 'border-neutral-200 bg-neutral-50'}`}>
      <p className="flex items-center gap-2 text-[13px] font-semibold leading-snug text-neutral-950">
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <span className="min-w-0">
          {claimed
            ? <>Guest says they paid {inr(payment.amount)} by UPI{claimedAt ? <span className="font-normal text-neutral-600"> at {claimedAt}</span> : null}</>
            : waitingOnGuest
              ? <>Guest is paying {inr(payment.amount)} by UPI</>
              : <>Guest will pay {inr(payment.amount)} by {word}</>}
        </span>
      </p>
      {payment.wallet_amount > 0 && <p className="mt-0.5 pl-6 text-[11px] text-neutral-600">{inr(payment.wallet_amount)} more comes from their wallet.</p>}
      {(payment.paid_before ?? 0) > 0 && (
        <p className="mt-0.5 pl-6 text-[11px] font-medium text-sky-800">{inr(payment.paid_before ?? 0)} was already paid earlier on this bill. Collect only this part.</p>
      )}
      {claimed && <p className="mt-0.5 pl-6 text-[11px] text-amber-900">Look at their phone screen for the UPI success message, and check the amount.</p>}

      {!waitingOnGuest && (
        <button
          type="button"
          onClick={() => void verify()}
          disabled={busy}
          className={`mt-2 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg text-[13px] font-semibold text-white disabled:opacity-60 ${claimed ? 'bg-emerald-700 active:bg-emerald-800' : 'bg-neutral-950 active:bg-neutral-800'}`}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" aria-hidden />}
          {busy ? 'Confirming…' : claimed ? 'Confirm payment received' : `${inr(payment.amount)} received by ${word}`}
        </button>
      )}
      {failed && <p role="alert" className="mt-1.5 text-center text-[11px] font-medium text-rose-700">Could not save that. Please try again.</p>}
    </section>
  );
}

export default LiveTablePayment;
