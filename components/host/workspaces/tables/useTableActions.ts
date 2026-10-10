'use client';

import { useState } from 'react';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';

export type Tender = 'CASH' | 'UPI' | 'CARD';

interface BillTotals { subtotal: number; tax: number; total: number; orderId: string | null }

/** Settle a table's bill by payment, or free the table when nothing was started. */
export function useTableActions(venueId: string, tableNumber: string, bill: BillTotals, onDone: () => void) {
  const [busy, setBusy] = useState<'settle' | 'release' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (kind: 'settle' | 'release', body: Record<string, unknown>) => {
    setBusy(kind);
    setError(null);
    const result = await apiRequest('/api/host/sessions', jsonRequest('PATCH', { business_id: venueId, table_number: tableNumber, ...body }));
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    onDone();
    return true;
  };

  const settle = (tender: Tender) => run('settle', {
    order_id: bill.orderId ?? undefined,
    payment_method: tender,
    subtotal: bill.subtotal,
    tax_amount: bill.tax,
    grand_total: bill.total,
  });

  const release = () => run('release', { action: 'release' });

  return { busy, error, settle, release, setError };
}
