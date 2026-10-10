import { useRef } from 'react';
import type { InvoiceData } from '../InvoicePreviewModal';
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

  return async (onHistoryRefresh?: () => void, paymentMethod?: 'UPI' | 'CASH' | 'CARD') => {
    if (isSettlingRef.current) return;
    isSettlingRef.current = true;
    const { selectedTableId: tableId, selectedTableNumber: tableNumber, activeSessionId: sessionId } = cart;
    const isTableOrder = Boolean(sessionId || tableId || (tableNumber && tableNumber !== 'Takeaway / Counter'));

    try {
      if (isTableOrder) {
        const response = await fetch('/api/host/sessions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId, order_id: cart.linkedOrderId, table_id: tableId, table_number: tableNumber,
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
        await broadcastTableSettled(tableNumber, cart.grandTotal);
      }
      // Counter/takeaway bills: the platform fee is charged server-side when the order is saved.

      dispatchWalletRefreshEvents();
      setInvoicePreview(null);
      cart.resetCart();
      if (tableId || (tableNumber && tableNumber !== 'Takeaway / Counter')) {
        await markTableVacant(tableId || tableNumber, isTableOrder);
      } else {
        await fetchTables();
      }
      setSuccessMessage(sessionId ? 'Bill settled. Table is now vacant.' : 'Bill saved and finalized successfully');
      window.setTimeout(() => setSuccessMessage(''), 3500);
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