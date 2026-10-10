'use client';

import React from 'react';
import { Check } from 'lucide-react';
import type { KitchenItem } from '@/lib/utils/kitchen';
import { parseItemNotes } from '@/lib/utils/kot-notes';

interface KotItemsProps {
  items: KitchenItem[];
  onToggle: (idx: number) => void;
}

/** Each dish with its quantity, add-ons and the guest's instructions. Tap a dish to tick it off. */
export function KotItems({ items, onToggle }: KotItemsProps) {
  return (
    <ul className="divide-y divide-neutral-100">
      {items.map((item, idx) => {
        const done = Boolean(item.completed);
        const qty = Number(item.qty || (item as any).quantity) || 1;
        const { addons, instructions } = parseItemNotes(item.notes);
        return (
          <li key={idx}>
            <button
              type="button"
              onClick={() => onToggle(idx)}
              aria-pressed={done}
              aria-label={`${qty} ${item.name}${done ? ', done' : ''}`}
              className="flex min-h-11 w-full items-start gap-3 py-2.5 text-left cursor-pointer"
            >
              <span
                className={`mt-0.5 flex h-7 min-w-[1.75rem] shrink-0 items-center justify-center rounded-lg px-1.5 font-mono text-sm font-bold ${
                  done ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-950 text-white'
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : `${qty}×`}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[15px] font-semibold leading-snug ${done ? 'text-neutral-400 line-through' : 'text-neutral-950'}`}>
                  {done ? `${qty}× ` : ''}{item.name}
                </span>
                {addons.length > 0 && (
                  <span className="mt-1 flex flex-wrap gap-1">
                    {addons.map((a) => (
                      <span key={a} className="rounded-md bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium text-sky-900">+ {a}</span>
                    ))}
                  </span>
                )}
                {instructions.map((n) => (
                  <span key={n} className="mt-1 block rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900">
                    “{n}”
                  </span>
                ))}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default KotItems;
