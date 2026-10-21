import { useState, useEffect, useRef } from 'react';
import type { InvoiceData } from '@/lib/utils/receipt-adapter';
import { newUuid } from '@/lib/utils/uuid';

export type Tender = 'UPI' | 'CASH' | 'CARD';
/** What a room payment from the till does: adjust it in the running stay, or settle the stay and check the guest out. */
export type RoomMode = 'payment' | 'checkout';
export interface SaveResult {
  orderId: string | null;
  settled: boolean;
  /** A room payment adjusted in the stay (mode 'payment'): what was taken and what the guest still owes. */
  payment?: { amount: number; balance: number; paidSoFar: number } | null;
  /** Cash bill: the change to hand back, as the server recorded it. */
  change?: number | null;
}

const SAVE_TIMEOUT_MS = 30_000;

export function useDigitalReceiptActions(
  invoice: InvoiceData,
  onSuccess?: (paymentMethod: Tender, result: SaveResult) => void | Promise<void>,
) {
  const [paymentMethod, setPaymentMethod] = useState<Tender>('UPI');
  const [upiConfirmed, setUpiConfirmed] = useState(false);
  // A room bill never checks the guest out by accident: adjusting the payment in the stay is the default, checking
  // out is a choice the host makes on the receipt (or made at the desk with "check out & bill", which arrives chosen).
  // The amount can be part of the bill (a guest paying some now).
  const [roomMode, setRoomMode] = useState<RoomMode>(invoice.settlement?.mode === 'checkout' ? 'checkout' : 'payment');
  const [roomAmount, setRoomAmount] = useState<number>(Math.max(0, Math.round(invoice.grandTotal * 100) / 100));
  // Cash: the notes handed over (null = the exact amount). The change is worked out here and recorded with the bill.
  const [cashTendered, setCashTendered] = useState<number | null>(null);
  const due = invoice.room_id && invoice.settlement && roomMode === 'payment' ? roomAmount : invoice.grandTotal;
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
    if (invoice.room_id && roomMode === 'payment' && !(roomAmount > 0)) { setSaveError('Enter the amount the guest is paying now.'); return; }
    if (paymentMethod === 'CASH' && cashTendered !== null && cashTendered + 0.005 < due) { setSaveError(`₹${cashTendered.toLocaleString('en-IN')} is less than the ₹${Math.round(due).toLocaleString('en-IN')} due.`); return; }
    inFlight.current = true;
    setIsSaving(true);
    setSaveError(null);
    // AbortSignal.timeout is missing on older phone browsers, so the timer is set by hand.
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), SAVE_TIMEOUT_MS);
    try {
      const settlement = invoice.room_id && invoice.settlement ? { ...invoice.settlement, mode: roomMode, amount: roomMode === 'payment' ? roomAmount : undefined } : invoice.settlement;
      const payload = {
        ...invoice, settlement, id: orderIdRef.current, paymentMethod,
        cashTendered: paymentMethod === 'CASH' ? cashTendered : null,
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
      await onSuccess(paymentMethod, { orderId: data?.order?.id ?? orderIdRef.current, settled: Boolean(data?.settled), payment: data?.payment || null, change: typeof data?.change === 'number' ? data.change : null });
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
    paymentMethod, setPaymentMethod, upiConfirmed, setUpiConfirmed, roomMode, setRoomMode, roomAmount, setRoomAmount,
    cashTendered, setCashTendered, due, isSaving, saveError, isOnline, handlePrint, handleSaveOrder,
  };
}
