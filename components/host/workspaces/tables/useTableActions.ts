'use client';

import { useRef, useState } from 'react';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';

export type Tender = 'CASH' | 'UPI' | 'CARD';

interface BillTotals { subtotal: number; tax: number; total: number; orderId: string | null }

/** What the waiter's action did: asked billing to settle, or freed a table that had nothing started. */
export type TableActionKind = 'request' | 'release';

/**
 * A waiter's actions on a live table. Settling is not one of them: the bill goes to billing as a bill request, and the
 * cashier settles it there. An unstarted table can still be freed.
 */
export function useTableActions(venueId: string, tableNumber: string, bill: BillTotals, onDone: (kind: TableActionKind) => void) {
  const [busy, setBusy] = useState<TableActionKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);
  const inFlight = useRef(false);

  const run = async (kind: TableActionKind, body: Record<string, unknown>) => {
    // A second tap while the first is still being sent must not send twice.
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
    if (kind === 'request') setRequested(true);
    onDone(kind);
    return true;
  };

  /** Sends this table's bill to billing, with its running total, so the cashier sees what to settle. */
  const sendToBilling = () => run('request', {
    action: 'request_bill',
    order_id: bill.orderId ?? undefined,
    subtotal: bill.subtotal,
    tax_amount: bill.tax,
    grand_total: bill.total,
  });

  const release = () => run('release', { action: 'release' });

  return { busy, error, requested, sendToBilling, release, setError };
}
