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
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-[20px] bg-[#fbf9f4] px-3 py-2.5 text-left shadow-[0_14px_30px_-26px_rgba(16,35,26,0.55)] ring-1 ring-[#e8dfcc] transition active:scale-[0.98]">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0f2a1e]">
          <Truck className="h-4 w-4 text-[#d9c193]" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold text-[#10231a]">Order for delivery</span>
          <span className="block truncate text-[11px] text-[#10231a]/55">{detail}</span>
        </span>
      </button>
      <DeliveryCheckoutSheet isOpen={open} onClose={() => setOpen(false)} cafeId={cafeId}
        cartItems={items} subtotal={subtotal} onPlaced={() => setOpen(false)} />
    </>
  );
}
