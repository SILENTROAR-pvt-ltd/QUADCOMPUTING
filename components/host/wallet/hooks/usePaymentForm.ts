import { useEffect, useState } from 'react';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';
import { TOPUP_LIMITS } from '@/lib/services/wallet/plans';
import type { PaymentTarget, PlatformPayment } from './useWalletWorkspace';

const UTR = /^[A-Z0-9]{12,22}$/;

/** UPI link the QR encodes: opens any UPI app with the payee, exact amount and a note filled in. */
export function upiLink(payment: PlatformPayment, amount: number, note: string) {
  const q = new URLSearchParams({ pa: payment.upi_id, pn: payment.payee_name, am: amount.toFixed(2), cu: 'INR', tn: note });
  return `upi://pay?${q.toString()}`;
}

/** One form for both payments the venue makes to the platform: a wallet top-up or a plan. */
export function usePaymentForm(venueId: string, target: PaymentTarget | null, onDone: () => void) {
  const [amountText, setAmountText] = useState('');
  const [utr, setUtr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAmountText(target?.kind === 'topup' ? String(target.amount) : '');
    setUtr('');
    setError(null);
  }, [target]);

  const amount = target?.kind === 'plan' ? target.plan.price : Number(amountText);
  const amountOk = Number.isFinite(amount) && amount >= TOPUP_LIMITS.min && amount <= TOPUP_LIMITS.max;
  const cleanUtr = utr.replace(/\s/g, '').toUpperCase();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    if (!amountOk) return setError(`Enter an amount between ₹${TOPUP_LIMITS.min} and ₹${TOPUP_LIMITS.max.toLocaleString('en-IN')}.`);
    if (!UTR.test(cleanUtr)) return setError('Enter the 12-digit UTR / UPI reference shown in your payment app.');

    setSubmitting(true);
    setError(null);
    const body = target.kind === 'plan'
      ? { action: 'submit_topup_request', requestType: 'plan_subscription', planTier: target.plan.id, utrNumber: cleanUtr, venueId }
      : { action: 'submit_topup_request', requestType: 'wallet_topup', amount, utrNumber: cleanUtr, venueId };
    const res = await apiRequest('/api/host/wallet', jsonRequest('POST', body));
    setSubmitting(false);
    if (!res.ok) return setError(res.error);
    onDone();
  };

  return { amount, amountOk, amountText, setAmountText, utr, setUtr, submitting, error, submit };
}
