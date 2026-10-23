'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Minus, PencilLine, Plus, Trash2 } from 'lucide-react';
import type { CartItem } from '@/lib/store/cart.store';
import { rupees } from '@/lib/guest/cashback';
import { AnimatedCount } from '../AnimatedCount';
import { press } from '../motion';

const SERIF = { fontFamily: "var(--font-luxe), 'Playfair Display', Georgia, serif" } as const;
const STEP = 'grid h-9 w-9 cursor-pointer place-items-center rounded-full text-[#10231a]/65 hover:text-[#10231a] active:bg-[#efe7d6]';

interface CartLineItemProps {
  item: CartItem;
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onRemove: (id: string) => void;
  onNote: (id: string, note: string) => void;
}

/** One dish in the review: photo, name, extras, price, a stepper, remove, and its own note to the kitchen. */
export function CartLineItem({ item, onIncrement, onDecrement, onRemove, onNote }: CartLineItemProps) {
  return (
    <div className="space-y-1.5 py-3">
      <div className="flex items-start gap-3">
        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[14px] bg-[#efe7d6] ring-1 ring-[#e8dfcc]">
          {item.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- the venue's own dish photo, already sized for the menu
            <img src={item.image_url} alt={item.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
          ) : (
            <span aria-hidden className="grid h-full w-full place-items-center text-xl italic text-[#b08d57]" style={SERIF}>{item.name.charAt(0)}</span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-[19px] font-semibold leading-snug text-[#10231a]" style={SERIF}>{item.name}</h4>
          <div className="mt-0.5 text-xs text-[#10231a]/55">{rupees(item.total_item_price)} each</div>
          {item.selected_addons.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.selected_addons.map((a, i) => (
                <span key={i} className="inline-flex items-center rounded-full border border-[#d9c193] bg-[#fbf6e8] px-2 py-0.5 text-[10px] font-medium text-[#6f5631]">+ {a.name} ({rupees(a.price)})</span>
              ))}
            </div>
          )}
        </div>
        <span className="shrink-0 text-sm font-bold tabular-nums text-[#0f2a1e]">{rupees(item.total_item_price * item.quantity)}</span>
      </div>

      <div className="flex items-center justify-end gap-2">
        <motion.button type="button" onClick={() => onRemove(item.cart_id)} aria-label={`Remove ${item.name}`} {...press}
          className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-zinc-400 hover:bg-red-50 hover:text-red-600">
          <Trash2 className="h-3.5 w-3.5" />
        </motion.button>
        <div className="flex items-center rounded-full border border-[#e8dfcc] bg-[#f8f4ea]">
          <motion.button type="button" onClick={() => onDecrement(item.cart_id)} aria-label={`One less ${item.name}`} {...press} className={STEP}><Minus className="h-3.5 w-3.5" /></motion.button>
          <AnimatedCount value={item.quantity} className="w-6 text-center text-xs font-semibold text-[#10231a]" />
          <motion.button type="button" onClick={() => onIncrement(item.cart_id)} aria-label={`One more ${item.name}`} {...press} className={STEP}><Plus className="h-3.5 w-3.5" /></motion.button>
        </div>
      </div>

      {/* This dish's own note: it goes to the kitchen under this dish only. */}
      <label className="flex items-center gap-2 rounded-2xl border border-[#e8dfcc] bg-[#f8f4ea] px-3 transition-colors focus-within:border-[#b08d57] focus-within:bg-white">
        <PencilLine className="h-3.5 w-3.5 shrink-0 text-[#b08d57]" aria-hidden />
        <span className="sr-only">Note for {item.name}</span>
        <input type="text" value={item.notes || ''} onChange={(e) => onNote(item.cart_id, e.target.value)} maxLength={120}
          placeholder="Note for this dish, e.g. less spicy"
          className="h-10 w-full bg-transparent text-[16px] text-[#10231a] placeholder:text-[#10231a]/40 focus:outline-none sm:h-9 sm:text-xs" />
      </label>
    </div>
  );
}
