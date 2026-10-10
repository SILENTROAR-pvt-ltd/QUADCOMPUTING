'use client';

import React from 'react';
import { Utensils, Bed, Layers } from 'lucide-react';
import type { OfferCategory } from '@/types/offers';

interface OfferCategorySelectorProps {
  category: OfferCategory;
  onSelectCategory: (category: OfferCategory) => void;
}

export function OfferCategorySelector({
  category,
  onSelectCategory,
}: OfferCategorySelectorProps) {
  const categories: Array<{ id: OfferCategory; label: string; icon: React.ReactNode }> = [
    { id: 'food', label: 'Food', icon: <Utensils className="w-3 h-3" /> },
    { id: 'room', label: 'Room', icon: <Bed className="w-3 h-3" /> },
    { id: 'general', label: 'General', icon: <Layers className="w-3 h-3" /> },
  ];

  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
        Category
      </label>
      <div className="grid grid-cols-3 gap-1.5 bg-white p-1 rounded-xl border border-neutral-200/90">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.id)}
            className={`py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
              category === cat.id
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            {cat.icon}
            <span>{cat.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
