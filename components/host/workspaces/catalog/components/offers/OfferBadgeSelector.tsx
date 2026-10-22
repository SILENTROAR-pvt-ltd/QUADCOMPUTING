'use client';

import React from 'react';
import { BADGE_PRESETS } from './offer-templates';

interface OfferBadgeSelectorProps {
  discountBadge: string;
  customBadge: string;
  onSelectPreset: (preset: string) => void;
  onChangeCustom: (value: string) => void;
}

/** The tag guests see first ("20% OFF", "Buffet"): one tap on a preset, or typed. Scrolls sideways on a phone. */
export function OfferBadgeSelector({ discountBadge, customBadge, onSelectPreset, onChangeCustom }: OfferBadgeSelectorProps) {
  return (
    <div>
      <label htmlFor="offer-custom-tag" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-neutral-500">
        Tag guests see *
      </label>
      <div className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {BADGE_PRESETS.map((preset) => {
          const isSelected = discountBadge === preset && !customBadge;
          return (
            <button key={preset} type="button" onClick={() => onSelectPreset(preset)} aria-pressed={isSelected}
              className={`h-9 shrink-0 cursor-pointer rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${
                isSelected ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-700 hover:text-neutral-900'
              }`}>
              {preset}
            </button>
          );
        })}
      </div>
      <input id="offer-custom-tag" type="text" maxLength={40} placeholder="Or type your own tag: e.g. 50% Off Second Bottle"
        value={customBadge} onChange={(e) => onChangeCustom(e.target.value)}
        className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3.5 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none sm:text-sm" />
    </div>
  );
}
