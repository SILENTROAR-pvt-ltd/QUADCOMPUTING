'use client';

import React from 'react';
import { Utensils, Bed, Layers } from 'lucide-react';
import type { OfferCategory } from '@/types/offers';

interface OfferCategorySelectorProps {
  category: OfferCategory;
  onSelectCategory: (category: OfferCategory) => void;
}

const CATEGORIES: Array<{ id: OfferCategory; label: string; Icon: React.FC<{ className?: string }> }> = [
  { id: 'food', label: 'Food & drink', Icon: Utensils },
  { id: 'room', label: 'Rooms', Icon: Bed },
  { id: 'general', label: 'General', Icon: Layers },
];

/** Where the offer applies. Food offers send guests to the menu; the others are claimed from the lounge. */
export function OfferCategorySelector({ category, onSelectCategory }: OfferCategorySelectorProps) {
  return (
    <div>
      <p className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-neutral-500">Applies to</p>
      <div role="radiogroup" aria-label="Applies to" className="grid grid-cols-3 gap-1.5 rounded-xl border border-neutral-200 bg-white p-1">
        {CATEGORIES.map(({ id, label, Icon }) => (
          <button key={id} type="button" role="radio" aria-checked={category === id} onClick={() => onSelectCategory(id)}
            className={`flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-1 text-[13px] font-semibold transition-colors ${
              category === id ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900'
            }`}>
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
