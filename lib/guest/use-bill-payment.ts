'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';
import type { BillPayment, PaymentMethod } from '@/lib/services/payments/bill-payment.rules';

export interface UpiInfo {
  available: boolean;
  payee?: string;
  vpa?: string;
}

const POLL_MS = 4000;

/**
 * The guest's side of paying the bill: how they chose to pay, the venue's UPI details, and where staff have got to. It polls
 * only while the tab is visible. `ready` is false when the venue's payments are not set up, so the old flow carries on.
 * `choose` and `claim` return at once with what the phone already knows; the screens do not wait on the server.
 */
export function useBillPayment(cafeId: string, tableNumber: string, enabled = true) {
  const [payment, setPayment] = useState<BillPayment | null>(null);
  const [upi, setUpi] = useState<UpiInfo>({ available: false });
  const [billTotal, setBillTotal] = useState<number | null>(null);
  /** Paid and confirmed by staff already on this bill, before anything the guest added since. */
  const [paidSoFar, setPaidSoFar] = useState(0);
  const [lastStatus, setLastStatus] = useState<string | null>(null);
  const [ready, setReady] = useState<boolean | null>(null);
  const [loaded, setLoaded] = useState(false);
  const seenLive = useRef(false);
  const paymentRef = useRef<BillPayment | null>(null);
  paymentRef.current = payment;

  const refresh = useCallback(async () => {
    if (!cafeId || !tableNumber) return;
    try {
      const res = await fetch(`/api/guest/payment?cafe_id=${encodeURIComponent(cafeId)}&table=${encodeURIComponent(tableNumber)}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.success) {
        setReady(Boolean(data.ready));
        setPayment(data.payment ?? null);
        setUpi(data.upi ?? { available: false });
        if (typeof data.bill_total === 'number') setBillTotal(data.bill_total);
        setPaidSoFar(Number(data.paid_so_far) || 0);
        setLastStatus(typeof data.last_status === 'string' ? data.last_status : null);
        if (data.payment) seenLive.current = true;
      }
    } catch {
      // A dropped connection leaves what is on screen; the next poll catches up.
    } finally {
      setLoaded(true);
    }
  }, [cafeId, tableNumber]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, POLL_MS);
    return () => clearInterval(timer);
  }, [enabled, refresh]);

  /** Saves how the guest will pay. Resolves with the saved payment, or why it could not be. */
  const choose = useCallback(async (method: PaymentMethod, walletAmount = 0) => {
    const result = await apiRequest<any>('/api/guest/payment', jsonRequest('POST', {
      cafe_id: cafeId, table_number: tableNumber, method, wallet_amount: walletAmount,
    }));
    const data = result.data;
    if (result.ok && data?.success && data.payment) {
      setReady(true);
      setPayment(data.payment);
      setUpi(data.upi ?? { available: false });
      seenLive.current = true;
      return { ok: true as const, payment: data.payment as BillPayment };
    }
    if (data?.code === 'PAYMENTS_NOT_READY') setReady(false);
    return { ok: false as const, code: String(data?.code || ''), error: result.ok ? String(data?.error || 'Could not save your choice.') : result.error };
  }, [cafeId, tableNumber]);

  /** "I have paid". Pass the payment id when it has only just been created and the state has not caught up yet. */
  const claim = useCallback(async (id?: string) => {
    const target = id || paymentRef.current?.id;
    if (!target) return false;
    const result = await apiRequest<any>('/api/guest/payment', jsonRequest('PATCH', { cafe_id: cafeId, table_number: tableNumber, id: target }));
    if (result.ok && result.data?.success && result.data.payment) {
      setPayment(result.data.payment);
      return true;
    }
    return false;
  }, [cafeId, tableNumber]);

  // The bill is settled only when the payment that was live ended as settled. A payment that was cancelled or replaced does
  // not mean the bill was paid.
  const settled = loaded && !payment && seenLive.current && lastStatus === 'settled';

  return { payment, upi, billTotal, paidSoFar, ready, loaded, settled, refresh, choose, claim };
}
