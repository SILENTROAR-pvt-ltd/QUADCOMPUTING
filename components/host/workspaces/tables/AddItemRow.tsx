'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { press } from '@/components/guest/menu/motion';
import { AnimatedCount } from '@/components/guest/menu/AnimatedCount';
import type { CatalogItem } from './useMenuCatalog';

export const inr = (n: number) => `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

interface AddItemRowProps {
  item: CatalogItem;
  qty: number;
  onQty: (id: string, qty: number) => void;
}

/** One dish: its name and price on the left, the quantity stepper on the right. Never wider than the phone. */
function AddItemRowBase({ item, qty, onQty }: AddItemRowProps) {
  return (
    // content-visibility keeps a long menu cheap: rows off screen are not laid out until they are near.
    <li className={`flex min-h-[3.25rem] items-center gap-2 px-3 py-1.5 transition-colors [contain-intrinsic-size:auto_52px] [content-visibility:auto] ${qty > 0 ? 'bg-emerald-50/60' : ''}`}>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 break-words text-[13.5px] font-medium leading-snug text-neutral-950">{item.name}</p>
        <p className="truncate text-[11px] text-neutral-500">{item.category} · {inr(item.price)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {qty > 0 && (
          <>
            <motion.button type="button" onClick={() => onQty(item.id, qty - 1)} aria-label={`Remove one ${item.name}`} {...press}
              className="grid h-10 w-10 cursor-pointer place-items-center rounded-lg border border-neutral-200 bg-white"><Minus className="h-3.5 w-3.5" /></motion.button>
            <AnimatedCount value={qty} className="w-6 font-mono text-sm font-bold" />
          </>
        )}
        <motion.button type="button" onClick={() => onQty(item.id, qty + 1)} aria-label={`Add one ${item.name}`} {...press}
          className="grid h-10 w-10 cursor-pointer place-items-center rounded-lg bg-neutral-950 text-white"><Plus className="h-3.5 w-3.5" /></motion.button>
      </div>
    </li>
  );
}

// Tapping one dish re-renders only its own row, not the whole menu.
export const AddItemRow = React.memo(AddItemRowBase);
