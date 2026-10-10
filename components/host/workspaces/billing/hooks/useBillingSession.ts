import { useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { InvoiceData } from '../InvoicePreviewModal';
import { useBillingSettlement } from './useBillingSettlement';
import { handleTableSelection } from './handle-table-selection.util';

export { handleTableSelection };

interface UseBillingSessionProps {
  cart: any;
  tables: any[];
  activeStaff: any;
  markTableVacant: (tableId: string) => Promise<any>;
  fetchTables: () => Promise<any>;
  businessId?: string | null;
}

export function useBillingSession({
  cart,
  tables,
  activeStaff,
  markTableVacant,
  fetchTables,
  businessId,
}: UseBillingSessionProps) {
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [invoicePreview, setInvoicePreview] = useState<InvoiceData | null>(null);
  const isSyncingRef = useRef(false);
  const handleOrderSuccess = useBillingSettlement({ cart, markTableVacant, fetchTables, setInvoicePreview, setSuccessMessage });

  const billRequestedTables = tables.filter(
    (t: any) => t.activeSession?.status === 'bill_requested'
  );

  const handleMarkTableVacant = async (table: any) => {
    try {
      await markTableVacant(table.id || table.table_number);
      cart.resetCart();
      setSuccessMessage(`Table ${table.table_number} marked vacant and order cleared`);
    } catch {
      setSuccessMessage(`Unable to vacate Table ${table.table_number}. The running bill was kept.`);
    }
    setTimeout(() => setSuccessMessage(''), 3500);
  };

  const handleSelectActiveTable = useCallback(async (table: any) => {
    if (!table) return;
    const tableId = table.id;
    const tableNumber = table.table_number || table.name;
    cart.setSelectedTableId(tableId);
    cart.setSelectedTableNumber(tableNumber);

    const isVacant = (table.status || '').toUpperCase() === 'VACANT' && !table.activeSession;
    if (isVacant) {
      cart.setActiveSessionId(null);
      cart.setActiveSessionStatus(null);
      cart.setLinkedOrderId(null);
      cart.setLinkedGuestName(null);
      cart.setLinkedGuestPhone(null);
      cart.setLinkedGuestHandle(null);
      cart.setSelectedItems([]);
      setSuccessMessage(`Table ${tableNumber} selected (Ready for new order)`);
      setTimeout(() => setSuccessMessage(''), 3500);
      return;
    }

    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    try {
      const supabase = createClient();
      const { session, activeOrder, items } = await handleTableSelection(
        table,
        cart.setSelectedItems,
        cart.setLinkedOrderId,
        cart.setActiveSessionId,
        supabase,
        businessId || ''
      );

      const status = session?.status || table.activeSession?.status || 'open';
      cart.setActiveSessionStatus(status);
      cart.setLinkedGuestName(activeOrder?.customer_name || table.activeSession?.customerName || null);
      cart.setLinkedGuestPhone(activeOrder?.customer_phone || null);
      const foundHandle = session?.guest_handle || table.activeSession?.guestHandle || (activeOrder?.customer_name?.startsWith('@') ? activeOrder.customer_name : null);
      cart.setLinkedGuestHandle(foundHandle || null);

      if (items && items.length > 0) {
        setSuccessMessage(
          status === 'bill_requested'
            ? `⚡ Auto-populated Table ${tableNumber} requested bill (${items.length} items) — Ready for settlement`
            : `Loaded Table ${tableNumber} running bill (${items.length} items)`
        );
      } else {
        cart.setSelectedItems([]);
        cart.setLinkedOrderId(null);
        cart.setActiveSessionId(null);
        setSuccessMessage(`Table ${tableNumber} selected (Ready for new order)`);
      }
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (e) {
      console.error('Failed to load table session', e);
      cart.setSelectedTableId(tableId);
      cart.setSelectedTableNumber(tableNumber);
    } finally {
      isSyncingRef.current = false;
    }
  }, [businessId, cart]);

  const handleGenerateBill = () => {
    if (cart.selectedItems.length === 0 && !cart.customAmount) return;

    const invoice: InvoiceData = {
      business_id: businessId || undefined,
      items: [...cart.selectedItems],
      subtotal: cart.subtotal,
      discountType: cart.discountType,
      discountValue: cart.discountValue,
      discountAmount: cart.discountAmount,
      taxAmount: cart.gstAmount,
      grandTotal: cart.grandTotal,
      table_id: cart.selectedTableId || undefined,
      table_number: cart.selectedTableNumber,
      room_id: cart.selectedRoomId || undefined,
      guest_name: cart.linkedGuestName || undefined,
      guest_phone: cart.linkedGuestPhone || undefined,
      served_by_staff_id: activeStaff?.id,
      staff_name: activeStaff?.name,
    };
    if (cart.linkedOrderId) {
      invoice.id = cart.linkedOrderId;
    }
    if (Number(cart.customAmount) > 0) {
      invoice.items.push({ id: 'custom', name: 'Custom Entry', price: Number(cart.customAmount), qty: 1 });
    }
    setInvoicePreview(invoice);
  };

  const fetchOrderHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/host/orders/history');
      if (res.ok) {
        const data = await res.json();
        setOrderHistory(data.orders || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  return {
    orderHistory,
    isLoadingHistory,
    successMessage,
    invoicePreview,
    setInvoicePreview,
    billRequestedTables,
    handleMarkTableVacant,
    handleSelectActiveTable,
    handleGenerateBill,
    handleOrderSuccess,
    fetchOrderHistory,
  };
}
