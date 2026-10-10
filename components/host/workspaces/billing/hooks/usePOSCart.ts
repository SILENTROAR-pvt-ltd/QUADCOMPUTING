'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CatalogItem } from '@/types';
import type { CatalogItemPayload } from '../controls/POSCatalogGrid';
import { FOOD_GST_RATE, SERVICE_GST_RATE, defaultGstRate, formatGstRates } from '@/lib/utils/gst-rates';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  type?: string;
  isAdHoc?: boolean;
  tax_rate?: number;
}

export function usePOSCart(activeItems: CatalogItem[] = []) {
  const [selectedItems, setSelectedItems] = useState<CartItem[]>([]);
  const [customAmount, setCustomAmount] = useState('');
  const [gstEnabled, setGstEnabled] = useState(true);

  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [discountInputValue, setDiscountInputValue] = useState('');

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSessionStatus, setActiveSessionStatus] = useState<'open' | 'bill_requested' | null>(null);
  const [linkedOrderId, setLinkedOrderId] = useState<string | null>(null);
  const [linkedGuestName, setLinkedGuestName] = useState<string | null>(null);
  const [linkedGuestPhone, setLinkedGuestPhone] = useState<string | null>(null);
  const [linkedGuestHandle, setLinkedGuestHandle] = useState<string | null>(null);
  const [redemptionCode, setRedemptionCode] = useState<string | null>(null);
  const [verifiedRedemption, setVerifiedRedemption] = useState<any | null>(null);
  const [cashbackEnabled, setCashbackEnabled] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedTableNumber, setSelectedTableNumber] = useState<string>('Takeaway / Counter');

  const loadDineInSession = useCallback((sessionData: {
    sessionId: string;
    orderId?: string;
    tableId?: string;
    tableNumber: string;
    status: 'open' | 'bill_requested';
    items: Array<{ id: string; name: string; price: number; qty: number; notes?: string }>;
    guestName?: string | null;
    guestPhone?: string | null;
  }) => {
    setActiveSessionId(sessionData.sessionId);
    setActiveSessionStatus(sessionData.status);
    setLinkedOrderId(sessionData.orderId || null);
    setSelectedTableId(sessionData.tableId || null);
    setSelectedTableNumber(sessionData.tableNumber);
    if (sessionData.guestName) setLinkedGuestName(sessionData.guestName);
    if (sessionData.guestPhone) setLinkedGuestPhone(sessionData.guestPhone);
    if ((sessionData as any).guestHandle) setLinkedGuestHandle((sessionData as any).guestHandle);
    setSelectedRoomId(null);

    const formattedCartItems: CartItem[] = (sessionData.items || []).map((it) => ({
      id: it.id,
      name: it.name,
      price: Number(it.price) || 0,
      qty: Math.max(1, Number(it.qty) || 1),
    }));

    setSelectedItems(formattedCartItems);
  }, []);

  useEffect(() => {
    try {
      localStorage.removeItem('quad_pos_cart');
    } catch {}
  }, []);

  useEffect(() => {
    const populateCartWithRoomOrder = (data: any) => {
      if (!data || typeof data !== 'object') return;
      const items = Array.isArray(data.items)
        ? data.items.map((it: any) => ({
            id: it.id || `item-${Math.random().toString(36).substring(7)}`,
            name: it.name,
            price: Number(it.price) || 0,
            qty: Number(it.qty) || 1,
          }))
        : [];

      if (items.length > 0) {
        setSelectedItems(items);
      }
      if (data.room_id) setSelectedRoomId(data.room_id);
      if (data.table_number) setSelectedTableNumber(data.table_number);
      setSelectedTableId(null);
      setLinkedOrderId(data.id || data.order_id || null);
      setLinkedGuestName(data.guest_name || data.customer_name || null);
      setLinkedGuestPhone(data.guest_phone || data.customer_phone || null);
      setGstEnabled(false);
    };

    try {
      const savedInvoice = sessionStorage.getItem('quad_preloaded_invoice');
      if (savedInvoice) {
        sessionStorage.removeItem('quad_preloaded_invoice');
        const parsed = JSON.parse(savedInvoice);
        if (parsed && typeof parsed === 'object') populateCartWithRoomOrder(parsed);
      }
    } catch {}

    const handlePreloadEvent = (event: any) => {
      if (event?.detail) populateCartWithRoomOrder(event.detail);
    };
    window.addEventListener('quad:preload-invoice' as any, handlePreloadEvent);

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlOrderId = params.get('orderId');
      if (urlOrderId) {
        fetch('/api/host/orders/history')
          .then((r) => r.json())
          .then((d) => {
            const found = (d.orders || []).find((o: any) => o.id === urlOrderId);
            if (found) populateCartWithRoomOrder({ ...found, isReadOnly: true });
          })
          .catch(() => {});
      }
    }

    return () => {
      window.removeEventListener('quad:preload-invoice' as any, handlePreloadEvent);
    };
  }, []);

  const customNum = parseFloat(customAmount) || 0;
  const itemsSubtotal = selectedItems.reduce((acc, curr) => acc + curr.price * curr.qty, 0);
  const subtotal = itemsSubtotal + customNum;

  const parsedDiscountInput = parseFloat(discountInputValue);
  const discountValue = isNaN(parsedDiscountInput) || parsedDiscountInput < 0 ? 0 : parsedDiscountInput;

  let discountAmount = 0;
  if (discountType === 'percentage') {
    const validPercent = Math.min(100, discountValue);
    discountAmount = (subtotal * validPercent) / 100;
  } else {
    discountAmount = Math.min(subtotal, discountValue);
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const gstAmount = gstEnabled
    ? selectedItems.reduce((acc, curr) => {
        const itemTotal = curr.price * curr.qty;
        const rate = curr.tax_rate ?? FOOD_GST_RATE;
        const proportion = subtotal > 0 ? itemTotal / subtotal : 0;
        const discountedItemTotal = taxableAmount * proportion;
        return acc + discountedItemTotal * rate;
      }, 0) + (customNum > 0 && subtotal > 0 ? (taxableAmount * (customNum / subtotal)) * SERVICE_GST_RATE : 0)
    : 0;
  // What the receipt shows next to "GST" — the rates actually applied, not a fixed "18%".
  const gstRateLabel = formatGstRates([
    ...selectedItems.map((i) => i.tax_rate ?? FOOD_GST_RATE),
    ...(customNum > 0 ? [SERVICE_GST_RATE] : []),
  ]);

  const grandTotal = Math.round(taxableAmount + gstAmount);
  // Same base the settlement function credits: the full bill before discount and before tax.
  // A discount or a wallet redemption does not reduce the guest's cashback.
  const cashbackAmount = cashbackEnabled ? Math.round(subtotal * 0.07 * 100) / 100 : 0;

  const handleAddItemToCart = useCallback((item: CatalogItemPayload) => {
    setSelectedItems((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing) {
        return prev.map((p) => (p.id === item.id ? { ...p, qty: p.qty + 1 } : p));
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: item.price,
          qty: 1,
          type: item.category || 'service',
          isAdHoc: false,
          tax_rate: item.tax_rate ?? defaultGstRate(item),
        },
      ];
    });
  }, []);

  const handleAddCustomItem = useCallback((name: string, price: number) => {
    if (!name.trim() || isNaN(price) || price <= 0) return;
    const customItem: CartItem = {
      id: 'custom_' + Date.now(),
      name: name.trim(),
      price: price,
      qty: 1,
      type: 'custom_service',
      isAdHoc: true,
      tax_rate: SERVICE_GST_RATE,
    };
    setSelectedItems((prev) => [...prev, customItem]);
  }, []);

  const addItem = useCallback((catalogId: string) => {
    const item = activeItems.find((i) => i.id === catalogId);
    if (!item) return;
    const price = item.kind === 'accommodation' ? item.nightlyRate.amountMinor : item.price.amountMinor;
    handleAddItemToCart({
      id: item.id,
      name: item.name,
      price,
      tax_rate: defaultGstRate(item),
      category: item.kind === 'food_beverage' ? 'F&B' : item.kind === 'accommodation' ? 'Room Add-ons' : 'Services',
    });
  }, [activeItems, handleAddItemToCart]);

  const removeItem = useCallback((id: string) => {
    setSelectedItems((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const incrementItem = useCallback((id: string) => {
    setSelectedItems((prev) => prev.map((p) => (p.id === id ? { ...p, qty: p.qty + 1 } : p)));
  }, []);

  const decrementItem = useCallback((id: string) => {
    setSelectedItems((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item && item.qty > 1) return prev.map((p) => (p.id === id ? { ...p, qty: p.qty - 1 } : p));
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const resetCart = useCallback(() => {
    setSelectedItems([]);
    setCustomAmount('');
    setDiscountInputValue('');
    setRedemptionCode(null);
    setVerifiedRedemption(null);
    setActiveSessionId(null);
    setActiveSessionStatus(null);
    setLinkedOrderId(null);
    setLinkedGuestName(null);
    setLinkedGuestPhone(null);
    setLinkedGuestHandle(null);
    setSelectedTableId(null);
    setSelectedRoomId(null);
    setSelectedTableNumber('Takeaway / Counter');
  }, []);

  return {
    selectedItems,
    setSelectedItems,
    customAmount,
    setCustomAmount,
    gstEnabled,
    setGstEnabled,
    discountType,
    setDiscountType,
    discountInputValue,
    setDiscountInputValue,
    discountValue,
    discountAmount,
    subtotal,
    taxableAmount,
    gstAmount,
    gstRateLabel,
    grandTotal,
    cashbackEnabled,
    setCashbackEnabled,
    cashbackAmount,
    linkedGuestHandle,
    setLinkedGuestHandle,
    redemptionCode,
    setRedemptionCode,
    verifiedRedemption,
    setVerifiedRedemption,
    activeSessionId,
    setActiveSessionId,
    activeSessionStatus,
    setActiveSessionStatus,
    loadDineInSession,
    linkedOrderId,
    setLinkedOrderId,
    linkedGuestName,
    setLinkedGuestName,
    linkedGuestPhone,
    setLinkedGuestPhone,
    selectedRoomId,
    setSelectedRoomId,
    selectedTableId,
    setSelectedTableId,
    selectedTableNumber,
    setSelectedTableNumber,
    handleAddItemToCart,
    handleAddCustomItem,
    addItem,
    removeItem,
    incrementItem,
    decrementItem,
    resetCart,
  };
}
