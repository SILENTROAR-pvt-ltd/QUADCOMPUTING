'use client';

import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { CartAddon } from '@/lib/store/cart.store';

interface CustomizationDrawerFooterProps {
  specialInstructions: string;
  setSpecialInstructions: (v: string) => void;
  quantity: number;
  setQuantity: React.Dispatch<React.SetStateAction<number>>;
  selectedAddonsList: CartAddon[];
  grandTotal: number;
  isSatisfied: boolean;
  onConfirmAddToCart: () => void;
}

export function CustomizationDrawerFooter({
  specialInstructions,
  setSpecialInstructions,
  quantity,
  setQuantity,
  selectedAddonsList,
  grandTotal,
  isSatisfied,
  onConfirmAddToCart,
}: CustomizationDrawerFooterProps) {
  return (
    <>
      {/* Special Cooking Instructions */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
          Special Instructions (Optional)
        </label>
        <input
          type="text"
          value={specialInstructions}
          onChange={(e) => setSpecialInstructions(e.target.value)}
          placeholder="e.g. Less spicy, dressing on side, allergy notes..."
          className="w-full text-base sm:text-sm px-4 py-3 rounded-2xl border border-neutral-800 bg-neutral-950 text-white placeholder:text-neutral-600 focus:outline-none focus:border-white transition-all"
        />
      </div>

      {/* Quantity Stepper */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-sm font-semibold text-neutral-300">Item Quantity</span>
        <div className="flex items-center gap-3 border border-neutral-800 rounded-full px-3 py-1 bg-neutral-950">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            className="p-1 text-neutral-400 disabled:opacity-30 hover:text-white transition-colors cursor-pointer"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-6 text-center text-sm font-bold text-white font-mono">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => q + 1)}
            className="p-1 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Floating Sticky CTA */}
      <div className="pt-3 border-t border-neutral-800 bg-neutral-900 pb-[calc(env(safe-area-inset-bottom,16px)+0.5rem)]">
        <button
          type="button"
          onClick={onConfirmAddToCart}
          disabled={!isSatisfied}
          className="w-full min-h-[48px] py-3.5 rounded-2xl bg-white text-neutral-950 font-bold text-base shadow-lg hover:bg-neutral-200 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-between px-6 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span>Add to Cart</span>
            {selectedAddonsList.length > 0 && (
              <span className="text-xs bg-neutral-200 text-neutral-950 px-2 py-0.5 rounded-full font-medium">
                {selectedAddonsList.length} extras
              </span>
            )}
          </div>
          <span className="text-lg font-bold font-mono">₹{grandTotal}</span>
        </button>
      </div>
    </>
  );
}
