'use client';

import { useRef, useState } from 'react';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';

export type Tender = 'CASH' | 'UPI' | 'CARD';

interface BillTotals { subtotal: number; tax: number; total: number; orderId: string | null }

/** Settle a table's bill by payment, or free the table when nothing was started. */
export function useTableActions(venueId: string, tableNumber: string, bill: BillTotals, onDone: (kind: 'settle' | 'release') => void) {
  const [busy, setBusy] = useState<'settle' | 'release' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const run = async (kind: 'settle' | 'release', body: Record<string, unknown>) => {
    // A second tap while the first is still being sent must not settle twice.
    if (inFlight.current) return false;
    inFlight.current = true;
    setBusy(kind);
    setError(null);
    const result = await apiRequest('/api/host/sessions', jsonRequest('PATCH', { business_id: venueId, table_number: tableNumber, ...body }));
    inFlight.current = false;
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    onDone(kind);
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
