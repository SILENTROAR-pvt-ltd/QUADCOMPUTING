'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { sharedGet } from '@/lib/utils/shared-get';
import { usePoll } from '@/lib/utils/use-poll';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';
import { paymentTableKey, type BillPayment } from '@/lib/services/payments/bill-payment.rules';

const POLL_MS = 6000;

/**
 * The venue's live bill payments, for the waiter's tables and the billing POS: what each table chose to pay with and what is
 * waiting for staff to confirm. Polls only while the tab is visible, and shares one request with other screens on the page.
 */
export function useLivePayments() {
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [ready, setReady] = useState(true);

  const refresh = useCallback(async () => {
    const res = await sharedGet<{ ready?: boolean; payments?: BillPayment[] }>('/api/host/payments');
    if (!res.ok) return;
    setReady(res.data?.ready !== false);
    setPayments(Array.isArray(res.data?.payments) ? res.data.payments : []);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  usePoll(() => { void refresh(); }, POLL_MS);

  /** The live payment of each table, keyed by the table's number in any spelling. */
  const byTable = useMemo(() => {
    const map = new Map<string, BillPayment>();
    for (const p of payments) map.set(paymentTableKey(p.table_number), p);
    return map;
  }, [payments]);

  const act = useCallback(async (id: string, action: 'verify' | 'cancel') => {
    const result = await apiRequest('/api/host/payments', jsonRequest('PATCH', { id, action }));
    await refresh();
    return result.ok;
  }, [refresh]);

  return {
    payments,
    byTable,
    ready,
    refresh,
    verify: (id: string) => act(id, 'verify'),
    cancel: (id: string) => act(id, 'cancel'),
  };
}
