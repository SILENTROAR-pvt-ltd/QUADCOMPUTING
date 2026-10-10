import { useState, useEffect } from 'react';
import type { InvoiceData } from '@/lib/utils/receipt-adapter';

export function useDigitalReceiptActions(invoice: InvoiceData, onSuccess?: (paymentMethod: 'UPI' | 'CASH' | 'CARD') => void) {
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CASH' | 'CARD'>('UPI');
  const [upiConfirmed, setUpiConfirmed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const handlePrint = () => window.print();
  const handleShareEmail = () => prompt("Enter client's email address to dispatch the receipt:");
  const handleShareSMS = () => prompt("Enter client's phone number to dispatch the receipt link:");

  const handleSaveOrder = async () => {
    if (invoice.isReadOnly || !onSuccess) return;
    setIsSaving(true);
    try {
      const payload = {
        ...invoice, paymentMethod,
        tableId: invoice.table_id || null,
        tableNumber: invoice.table_number || 'Takeaway / Counter',
        roomId: invoice.room_id || null, guestId: invoice.guest_id || null,
      };
      const res = await fetch('/api/host/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        onSuccess(paymentMethod);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to save order to database.');
      }
    } catch {
      alert('Error recording order.');
    } finally {
      setIsSaving(false);
    }
  };

  return {
    paymentMethod, setPaymentMethod, upiConfirmed, setUpiConfirmed,
    isSaving, isOnline, handlePrint, handleShareEmail, handleShareSMS, handleSaveOrder,
  };
}
