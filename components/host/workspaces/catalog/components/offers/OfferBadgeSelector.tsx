'use client';

import React from 'react';

const BADGE_PRESETS = [
  '20% OFF',
  '1+1 Free',
  'Happy Hour',
  'Free Breakfast',
  'Chef Special',
  'Complimentary Drink',
];

interface OfferBadgeSelectorProps {
  discountBadge: string;
  customBadge: string;
  onSelectPreset: (preset: string) => void;
  onChangeCustom: (value: string) => void;
}

export function OfferBadgeSelector({
  discountBadge,
  customBadge,
  onSelectPreset,
  onChangeCustom,
}: OfferBadgeSelectorProps) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
        Discount Tag / Badge *
      </label>
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {BADGE_PRESETS.map((preset) => {
          const isSelected = discountBadge === preset && !customBadge;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => onSelectPreset(preset)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                isSelected
                  ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                  : 'bg-white border-neutral-200 text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {preset}
            </button>
          );
        })}
      </div>
      <input
        type="text"
        placeholder="Or type custom tag: e.g. 50% Off Second Bottle"
        value={customBadge}
        onChange={(e) => onChangeCustom(e.target.value)}
        className="w-full h-9 px-3.5 rounded-xl border border-neutral-200/90 bg-white text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 shadow-2xs"
      />
    </div>
  );
}
