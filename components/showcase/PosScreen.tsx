'use client';

import React, { useState } from 'react';
import { POSCatalogGrid, type CatalogItemPayload } from '@/components/host/workspaces/billing/controls/POSCatalogGrid';
import { POSDiscountTaxControls } from '@/components/host/workspaces/billing/controls/POSDiscountTaxControls';
import { POSTableSelector } from '@/components/host/workspaces/billing/POSTableSelector';
import { POSDigitalReceipt, type CartItem } from '@/components/host/workspaces/billing/POSDigitalReceipt';
import { posCatalog, posTables } from '@/lib/showcase/demo-pos';
import { Chrome } from './ShowcaseChrome';

const GST = 0.05;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The till, drawn from the real POS components with the fictional café's catalogue and floor: pick a table, tap dishes,
 * and the receipt, GST and 7% cashback add up as they do at a real counter. Nothing is saved (no database here).
 */
export function PosScreen() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [tableId, setTableId] = useState<string | null>(null);
  const [tableNo, setTableNo] = useState('Takeaway / Counter');
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [discountInput, setDiscountInput] = useState('');
  const [gstEnabled, setGstEnabled] = useState(true);
  const [cashback, setCashback] = useState(true);

  const add = (item: CatalogItemPayload) => setItems((list) => (list.some((i) => i.id === item.id)
    ? list.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i))
    : [...list, { id: item.id, name: item.name, price: item.price, qty: 1 }]));
  const step = (id: string, by: number) => setItems((list) => list.map((i) => (i.id === id ? { ...i, qty: i.qty + by } : i)).filter((i) => i.qty > 0));

  const subtotal = items.reduce((a, i) => a + i.price * i.qty, 0);
  const discountValue = Number(discountInput) || 0;
  const discount = Math.min(subtotal, discountType === 'percentage' ? (subtotal * discountValue) / 100 : discountValue);
  const gst = gstEnabled ? round2((subtotal - discount) * GST) : 0;
  const total = round2(subtotal - discount + gst);
  const linked = tableId === 'pt4';

  return (
    <Chrome tab="billing" wide>
      <div className="grid min-w-0 grid-cols-12 items-start gap-8">
        <div data-demo="catalog" className="col-span-7 min-w-0 space-y-6 rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm">
          <POSCatalogGrid activeItems={posCatalog} cartItems={items} onAddItemToCart={add} />
          <hr className="border-zinc-100" />
          <POSDiscountTaxControls discountType={discountType} setDiscountType={setDiscountType} discountInputValue={discountInput}
            setDiscountInputValue={setDiscountInput} gstEnabled={gstEnabled} setGstEnabled={setGstEnabled} gstAllowed gstReason={null} />
        </div>
        <div className="col-span-5 min-w-0 space-y-4">
          <POSTableSelector tables={posTables} selectedTableId={tableId} setSelectedTableId={setTableId} selectedTableNumber={tableNo}
            setSelectedTableNumber={setTableNo} onSelectTakeaway={() => setItems([])} />
          <POSDigitalReceipt selectedItems={items} incrementItem={(id) => step(id, 1)} decrementItem={(id) => step(id, -1)}
            removeItem={(id) => step(id, -Infinity)} customAmount="" subtotal={subtotal} discountAmount={discount} discountType={discountType}
            discountValue={discountValue} gstEnabled={gstEnabled} gstAmount={gst} gstRateLabel="5%" grandTotal={total} handleGenerateBill={() => undefined}
            activeSessionId={linked ? 'demo-session' : null} activeSessionStatus={linked ? 'open' : null} selectedTableNumber={tableNo}
            cashbackEnabled={cashback} onToggleCashback={setCashback} cashbackAmount={round2(total * 0.07)} guestHandle={linked ? '@aanya' : null} />
        </div>
      </div>
    </Chrome>
  );
}
