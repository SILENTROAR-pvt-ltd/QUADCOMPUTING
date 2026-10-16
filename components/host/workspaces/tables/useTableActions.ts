'use client';

import { useRef, useState } from 'react';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';

export type Tender = 'CASH' | 'UPI' | 'CARD';

interface BillTotals { subtotal: number; tax: number; total: number; orderId: string | null }

/** What the waiter's action did: settled the bill and freed the table, asked billing to settle, or freed an unstarted table. */
export type TableActionKind = 'settle' | 'request' | 'release';

/**
 * A waiter's actions on a live table: settle the bill (choosing how the guest paid) and free the table, send the bill to
 * billing for the cashier instead, or free a table that has nothing started.
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

  /** Settles the bill as paid by `tender` and frees the table. The guest's set-aside cashback is applied on the server. */
  const settle = (tender: Tender) => run('settle', {
    action: 'waiter_settle',
    payment_method: tender,
    order_id: bill.orderId ?? undefined,
    subtotal: bill.subtotal,
    tax_amount: bill.tax,
    grand_total: bill.total,
  });

  const release = () => run('release', { action: 'release' });

  return { busy, error, requested, settle, sendToBilling, release, setError };
}
