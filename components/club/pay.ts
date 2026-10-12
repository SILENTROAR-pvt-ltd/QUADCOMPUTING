'use client';

import { clubFetch } from './api';

// Razorpay Checkout in the browser. The server already made the order; the success callback is
// verified by the server (signature check), and the webhook confirms it again independently.
const SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

function loadCheckout(): Promise<boolean> {
  if ((window as any).Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = SCRIPT;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export interface StartedPayment { payment: { gateway_order_id: string; amount: number; label: string }; keyId: string }

/** Opens checkout for a started payment. Resolves once the payment is captured, cancelled or failed. */
export async function payWithRazorpay(started: StartedPayment, prefill: { email?: string | null }): Promise<{ ok: boolean; error?: string }> {
  if (!(await loadCheckout())) return { ok: false, error: 'The payment window could not load. Check your connection.' };
  return new Promise((resolve) => {
    const checkout = new (window as any).Razorpay({
      key: started.keyId,
      order_id: started.payment.gateway_order_id,
      amount: started.payment.amount,
      currency: 'INR',
      name: 'Vibers Club',
      description: started.payment.label,
      prefill: { email: prefill.email || undefined },
      theme: { color: '#17301f' },
      handler: async (r: any) => {
        const res = await clubFetch('/payments/verify', { body: { order_id: r.razorpay_order_id, payment_id: r.razorpay_payment_id, signature: r.razorpay_signature } });
        resolve(res.ok ? { ok: true } : { ok: false, error: res.error });
      },
      modal: { ondismiss: () => resolve({ ok: false, error: 'Payment cancelled.' }) },
    });
    checkout.on('payment.failed', (r: any) => resolve({ ok: false, error: r?.error?.description || 'The payment failed.' }));
    checkout.open();
  });
}
