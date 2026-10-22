import { useState, useCallback, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { InvoiceData } from '../InvoicePreviewModal';
import { useBillingSettlement } from './useBillingSettlement';
import { applyTableLines, fetchTableLines, handleTableSelection, tableLinesKey, type TableLines } from './handle-table-selection.util';
import { useSelectActiveRoom } from './useSelectActiveRoom';
import { billOwner, isSharedSignedInBill } from '@/lib/services/wallet/bill-owner.util';

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

  // Each active table's live bill, loaded in the background as the table list changes, so tapping a table (most of
  // all one that asked for the bill) fills the POS at once. Keyed by the bill's version from the polled list.
  const linesCache = useRef(new Map<string, { key: string; lines: TableLines }>());
  const loadingKeys = useRef(new Set<string>());

  useEffect(() => {
    if (!businessId) return;
    const supabase = createClient();
    for (const table of tables) {
      const key = tableLinesKey(table);
      const id = table.id || table.table_number;
      if (!key || !id || linesCache.current.get(id)?.key === key || loadingKeys.current.has(key)) continue;
      loadingKeys.current.add(key);
      fetchTableLines(table, supabase, businessId)
        .then((lines) => { linesCache.current.set(id, { key, lines }); })
        .catch(() => {})
        .finally(() => { loadingKeys.current.delete(key); });
    }
  }, [tables, businessId]);

  // Puts a loaded bill on screen, with the wallet of the one signed-in guest who ordered every dish on it.
  const showTable = useCallback((table: any, lines: TableLines) => {
    const tableNumber = table.table_number || table.name;
    const { session, activeOrder, items } = applyTableLines(lines, table, cart.setSelectedItems, cart.setLinkedOrderId, cart.setActiveSessionId);

    const status = session?.status || table.activeSession?.status || 'open';
    cart.setActiveSessionStatus(status);
    cart.setLinkedGuestName(activeOrder?.customer_name || table.activeSession?.customerName || null);
    cart.setLinkedGuestPhone(activeOrder?.customer_phone || null);

    // Never from the table's shared session, its cache, or a name that looks like a handle: only from who ordered
    // each dish. A bill shared with other guests links no wallet and has its cashback switched off (the server
    // enforces the same rule at settlement). Redeeming a wallet code still works on any bill.
    const owner = billOwner(items || []);
    const shared = isSharedSignedInBill(owner);
    cart.setLinkedGuestHandle(owner.handle);
    cart.setCashbackEnabled(!shared);

    if (items && items.length > 0) {
      const base = status === 'bill_requested'
        ? `Table ${tableNumber} bill loaded (${items.length} items), ready to settle`
        : `Table ${tableNumber} running bill loaded (${items.length} items)`;
      const sharedNote = shared
        ? ` · Shared bill (${owner.handles.join(', ')}${owner.hasUnclaimed ? ' and guests without an account' : ''}): cashback off`
        : '';
      setSuccessMessage(base + sharedNote);
    } else {
      cart.setSelectedItems([]);
      cart.setLinkedOrderId(null);
      cart.setActiveSessionId(null);
      setSuccessMessage(`Table ${tableNumber} selected (Ready for new order)`);
    }
    setTimeout(() => setSuccessMessage(''), shared ? 6000 : 3500);
  }, [cart]);

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

    // A bill loaded in the background under the same version is current: show it at once, no wait.
    const key = tableLinesKey(table);
    const cached = key ? linesCache.current.get(tableId || tableNumber) : undefined;
    if (key && cached?.key === key) {
      showTable(table, cached.lines);
      return;
    }

    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    try {
      const lines = await fetchTableLines(table, createClient(), businessId || '');
      if (key) linesCache.current.set(tableId || tableNumber, { key, lines });
      showTable(table, lines);
    } catch (e) {
      console.error('Failed to load table session', e);
      cart.setSelectedTableId(tableId);
      cart.setSelectedTableNumber(tableNumber);
    } finally {
      isSyncingRef.current = false;
    }
  }, [businessId, cart, showTable]);

  const handleSelectActiveRoom = useSelectActiveRoom(cart, setSuccessMessage);

  const handleGenerateBill = () => {
    if (cart.selectedItems.length === 0 && !cart.customAmount) return;
    const isTableOrder = Boolean(cart.selectedRoomId || cart.selectedTableId || (cart.selectedTableNumber && cart.selectedTableNumber !== 'Takeaway / Counter'));
    // A bill that still carries a table's order but has lost its table would be saved as a second, counter bill while the
    // table's order stayed open. Refuse it and say how to put it right.
    if (!isTableOrder && cart.linkedOrderId) {
      setSuccessMessage('⚠️ This bill belongs to a table. Choose the table again to settle it, or Reset to start a counter bill.');
      setTimeout(() => setSuccessMessage(''), 6000);
      return;
    }

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
    if (cart.linkedGuestHandle) invoice.guest_handle = cart.linkedGuestHandle;
    // A table or room bill is saved and settled by one request; the receipt only has to carry what the POS knows. A
    // counter bill is never a settlement, whatever session id may linger from a table looked at earlier.
    if (isTableOrder) {
      invoice.settlement = {
        session_id: cart.activeSessionId || null,
        redemption_code: cart.redemptionCode || null,
        credit_cashback: cart.cashbackEnabled !== false,
        // A room handed over by the desk's "check out & bill" opens its receipt with checkout chosen.
        ...(cart.selectedRoomId ? { mode: cart.roomSettleIntent === 'checkout' ? 'checkout' as const : 'payment' as const } : {}),
      };
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
    handleSelectActiveRoom,
    handleGenerateBill,
    handleOrderSuccess,
    fetchOrderHistory,
  };
}
