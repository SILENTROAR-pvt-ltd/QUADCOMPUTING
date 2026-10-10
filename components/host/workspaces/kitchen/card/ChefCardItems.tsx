'use client';

import React from 'react';
import { Check } from 'lucide-react';
import type { KitchenItem } from '@/lib/utils/kitchen';

interface Props {
  items: KitchenItem[];
  onToggleItemDone: (idx: number) => void;
}

export function ChefCardItems({ items, onToggleItemDone }: Props) {
  return (
    <div className="flex-1 p-3.5 space-y-2 min-h-[110px]">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
        <span>Items to Prepare</span>
        <span className="font-mono text-neutral-500 font-medium">
          {items.length} {items.length === 1 ? 'Dish' : 'Dishes'}
        </span>
      </div>

      <div className="space-y-2 divide-y divide-neutral-100">
        {items.map((item, idx) => (
          <div
            key={idx}
            className={`pt-2 first:pt-0 flex items-start gap-2.5 transition-opacity ${
              item.completed ? 'opacity-40 line-through' : 'opacity-100'
            }`}
          >
            <button
              type="button"
              onClick={() => onToggleItemDone(idx)}
              className={`mt-0.5 h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                item.completed
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-neutral-300 hover:border-neutral-600 bg-white'
              }`}
              title={item.completed ? 'Mark pending' : 'Mark done'}
            >
              {item.completed && <Check className="h-3 w-3 stroke-[3]" />}
            </button>

            <div className="h-5 min-w-[22px] px-1 rounded-md bg-neutral-900 text-white font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
              {item.qty}×
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-neutral-900 leading-tight break-words">
                {item.name}
              </p>
              {item.notes && (
                <p className="mt-1 text-[10px] font-medium text-amber-800 bg-amber-50/80 border border-amber-200/60 px-1.5 py-0.5 rounded-md inline-block break-words">
                  {item.notes}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
