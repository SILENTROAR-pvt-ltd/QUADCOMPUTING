import { useState, useEffect, useRef } from 'react';
import type { InvoiceData } from '@/lib/utils/receipt-adapter';
import { newUuid } from '@/lib/utils/uuid';

export type Tender = 'UPI' | 'CASH' | 'CARD';
export interface SaveResult { orderId: string | null; settled: boolean }

const SAVE_TIMEOUT_MS = 30_000;

export function useDigitalReceiptActions(
  invoice: InvoiceData,
  onSuccess?: (paymentMethod: Tender, result: SaveResult) => void | Promise<void>,
) {
  const [paymentMethod, setPaymentMethod] = useState<Tender>('UPI');
  const [upiConfirmed, setUpiConfirmed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  // One id for this bill: a second tap, or a retry after a slow network, updates the same order instead of adding another.
  const orderIdRef = useRef<string>(invoice.id || newUuid());
  const inFlight = useRef(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const handlePrint = () => window.print();

  const handleSaveOrder = async () => {
    if (invoice.isReadOnly || !onSuccess || inFlight.current) return;
    inFlight.current = true;
    setIsSaving(true);
    setSaveError(null);
    // AbortSignal.timeout is missing on older phone browsers, so the timer is set by hand.
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), SAVE_TIMEOUT_MS);
    try {
      const payload = {
        ...invoice, id: orderIdRef.current, paymentMethod,
        tableId: invoice.table_id || null,
        tableNumber: invoice.table_number || 'Takeaway / Counter',
        roomId: invoice.room_id || null, guestId: invoice.guest_id || null,
      };
      const res = await fetch('/api/host/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abort.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        setSaveError(data?.error || 'The bill could not be saved. Please try again.');
        return;
      }
      // Waited for, so the button stays locked until the till has moved on; the modal closes from the caller.
      await onSuccess(paymentMethod, { orderId: data?.order?.id ?? orderIdRef.current, settled: Boolean(data?.settled) });
    } catch (e) {
      const timedOut = e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError');
      setSaveError(timedOut || !navigator.onLine
        ? 'The connection is slow. Tap Save again: it will not create a second bill.'
        : 'The bill could not be saved. Please try again.');
    } finally {
      clearTimeout(timer);
      inFlight.current = false;
      setIsSaving(false);
    }
  };

  return {
    paymentMethod, setPaymentMethod, upiConfirmed, setUpiConfirmed,
    isSaving, saveError, isOnline, handlePrint, handleSaveOrder,
  };
}
