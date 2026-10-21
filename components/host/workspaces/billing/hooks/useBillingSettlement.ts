import { useRef } from 'react';
import type { InvoiceData } from '../InvoicePreviewModal';
import type { SaveResult } from '@/components/shared/receipt/useDigitalReceiptActions';
import { broadcastTableSettled, dispatchWalletRefreshEvents, clearOrderIdUrlParam } from './settlement-helper.util';

interface UseBillingSettlementProps {
  cart: any;
  markTableVacant: (tableId: string, backendAlreadyUpdated?: boolean) => Promise<any>;
  fetchTables: () => Promise<any>;
  setInvoicePreview: (invoice: InvoiceData | null) => void;
  setSuccessMessage: (message: string) => void;
}

export function useBillingSettlement({
  cart, markTableVacant, fetchTables, setInvoicePreview, setSuccessMessage,
}: UseBillingSettlementProps) {
  const isSettlingRef = useRef(false);

  return async (onHistoryRefresh?: () => void, paymentMethod?: 'UPI' | 'CASH' | 'CARD', saved?: SaveResult) => {
    if (isSettlingRef.current) return;
    isSettlingRef.current = true;
    const { selectedTableId: tableId, selectedTableNumber: tableNumber, activeSessionId: sessionId, selectedRoomId: roomId } = cart;
    // A counter bill is a counter bill even if a table's session id lingers from earlier in the shift.
    const isTableOrder = Boolean(tableId || (tableNumber && tableNumber !== 'Takeaway / Counter'));
    // Change to hand back comes first in every message: it is the one thing the cashier must do now.
    const change = saved?.change && saved.change > 0 ? `Return ₹${Math.round(saved.change).toLocaleString('en-IN')} change. ` : '';

    try {
      // A room bill: the save request adjusted a payment in the stay, or ran the room checkout (orders/create decides
      // by the receipt's choice). The room list refreshes; there is no table to vacate.
      if (roomId) {
        if (!saved?.settled) throw new Error('The room payment was not recorded. Please retry.');
        dispatchWalletRefreshEvents();
        setInvoicePreview(null);
        cart.resetCart();
        try { window.dispatchEvent(new CustomEvent('quad:rooms-changed')); } catch {}
        const p = saved.payment;
        setSuccessMessage(change + (p
          ? `₹${Math.round(p.amount).toLocaleString('en-IN')} adjusted in the stay of ${tableNumber || 'the room'} · ${p.balance > 0 ? `₹${Math.round(p.balance).toLocaleString('en-IN')} still on the room bill` : 'nothing left to pay'} · guest stays checked in.`
          : `${tableNumber || 'Room'} checked out and settled.`));
        window.setTimeout(() => setSuccessMessage(''), p || change ? 7000 : 3500);
        clearOrderIdUrlParam();
        onHistoryRefresh?.();
        return;
      }
      // The save request already settled a table bill (one trip to the server instead of two). Only a bill the
      // server did not settle there goes through the table route here.
      if (isTableOrder && !saved?.settled) {
        const response = await fetch('/api/host/sessions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId, order_id: cart.linkedOrderId || saved?.orderId || undefined, table_id: tableId, table_number: tableNumber,
            action: 'settle_and_vacate', final_items: cart.selectedItems, subtotal: cart.subtotal,
            tax_amount: cart.gstAmount, grand_total: cart.grandTotal, discount_amount: cart.discountAmount,
            discount_type: cart.discountType, discount_value: cart.discountValue,
            redemption_code: cart.redemptionCode || undefined,
            // The receipt's "Credit 7% Guest Cashback" switch; previously never sent,
            // so cashback was credited even when the host turned it off.
            credit_cashback: cart.cashbackEnabled !== false,
            payment_method: paymentMethod,
            idempotency_key: `settle_${sessionId || tableId || tableNumber}_${Date.now()}`,
          }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Table settlement failed.');
      }
      // Counter/takeaway bills: the platform fee is charged server-side when the order is saved.

      // The till is free the moment the server has the bill: the screen clears and the table turns vacant at once,
      // and the table list refreshes in the background.
      if (isTableOrder) void broadcastTableSettled(tableNumber, cart.grandTotal);
      dispatchWalletRefreshEvents();
      setInvoicePreview(null);
      cart.resetCart();
      if (tableId || (tableNumber && tableNumber !== 'Takeaway / Counter')) {
        void markTableVacant(tableId || tableNumber, isTableOrder).catch(() => {});
      } else {
        void fetchTables();
      }
      setSuccessMessage(change + (sessionId ? 'Bill settled. Table is now vacant.' : 'Bill saved and finalized successfully'));
      window.setTimeout(() => setSuccessMessage(''), change ? 7000 : 3500);
      clearOrderIdUrlParam();
      onHistoryRefresh?.();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Settlement sync failed. Please retry.';
      console.error('[useBillingSettlement] Fatal settlement error:', errMsg, error);
      setSuccessMessage(`⚠️ ${errMsg}`);
      window.setTimeout(() => setSuccessMessage(''), 6000);
    } finally {
      isSettlingRef.current = false;
    }
  };
}
