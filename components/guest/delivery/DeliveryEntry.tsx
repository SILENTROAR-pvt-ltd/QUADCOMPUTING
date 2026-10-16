'use client';

import React, { useState } from 'react';
import { Truck } from 'lucide-react';
import { useCartStore } from '@/lib/store/cart.store';
import { rupees } from '@/lib/guest/cashback';
import { DeliveryCheckoutSheet } from './DeliveryCheckoutSheet';
import { useDeliveryTerms } from './useDeliveryTerms';

/** The menu's delivery tile: shown only when the venue takes delivery orders, and it opens checkout on the tray. */
export function DeliveryEntry({ cafeId }: { cafeId: string }) {
  const { terms } = useDeliveryTerms(cafeId);
  const items = useCartStore((s) => s.items);
  const [open, setOpen] = useState(false);
  if (!terms?.enabled) return null;

  const subtotal = items.reduce((sum, i) => sum + i.total_item_price * i.quantity, 0);
  const detail = items.length > 0 ? `Tray ${rupees(subtotal)}` : `Within ${terms.radius_km} km`;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-2xl bg-white px-3 py-2.5 text-left shadow-[0_1px_3px_rgba(0,0,0,0.08)] ring-1 ring-zinc-200/70 transition active:scale-[0.98]">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100">
          <Truck className="h-4 w-4 text-zinc-900" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold text-zinc-900">Order for delivery</span>
          <span className="block truncate text-[11px] text-zinc-500">{detail}</span>
        </span>
      </button>
      <DeliveryCheckoutSheet isOpen={open} onClose={() => setOpen(false)} cafeId={cafeId}
        cartItems={items} subtotal={subtotal} onPlaced={() => setOpen(false)} />
    </>
  );
}
