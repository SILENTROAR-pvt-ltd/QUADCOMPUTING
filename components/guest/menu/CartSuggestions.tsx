'use client';

import React, { useMemo } from 'react';
import { Plus } from 'lucide-react';
import type { MenuItem } from './types';
import { suggestForCart } from '@/lib/guest/cart-suggestions';

interface CartSuggestionsProps {
  cartItems: Array<{ item_id: string; category?: string; name?: string }>;
  menuItems: MenuItem[];
  /** The venue's own top picks, offered first. */
  featuredIds?: string[];
  /** Adds one of the dish in a tap; the dishes offered here never need a choice first. */
  onAdd: (item: MenuItem) => void;
}

/** Under the dishes in the order review: a drink if there is none, something sweet, and what goes with the order. */
export function CartSuggestions({ cartItems, menuItems, featuredIds = [], onAdd }: CartSuggestionsProps) {
  const sections = useMemo(
    () => suggestForCart(cartItems, menuItems as any, featuredIds),
    [cartItems, menuItems, featuredIds],
  );
  if (sections.length === 0) return null;
  const byId = new Map(menuItems.map((m) => [m.id, m]));

  return (
    <div className="mt-3 space-y-3 border-t border-zinc-100 pt-3">
      {sections.map((section) => (
        <section key={section.id} aria-label={section.title}>
          <h4 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">{section.title}</h4>
          <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {section.items.map((dish) => {
              const item = byId.get(dish.id);
              if (!item) return null;
              return (
                <li key={dish.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => onAdd(item)}
                    aria-label={`Add ${item.name}, ₹${item.price}`}
                    className="flex h-[58px] w-[168px] cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-white p-1.5 text-left transition-colors active:scale-[0.98] active:bg-zinc-50"
                  >
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                      {item.image_url
                        // eslint-disable-next-line @next/next/no-img-element -- the venue's own dish photo; images.unoptimized is set
                        ? <img src={item.image_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                        : <span aria-hidden className="grid h-full w-full place-items-center font-sans text-sm font-semibold text-zinc-400">{item.name.charAt(0)}</span>}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-sans text-[12px] font-semibold leading-tight text-zinc-900">{item.name}</span>
                      <span className="block font-sans text-[11px] font-medium text-zinc-500">₹{item.price}</span>
                    </span>
                    <span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#0A3222] text-white"><Plus size={13} strokeWidth={2.5} /></span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default CartSuggestions;
