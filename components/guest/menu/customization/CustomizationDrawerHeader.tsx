'use client';

import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { CustomizableItem } from './customization.types';

interface CustomizationDrawerHeaderProps {
  item: CustomizableItem;
  onClose: () => void;
}

export function CustomizationDrawerHeader({ item, onClose }: CustomizationDrawerHeaderProps) {
  return (
    <>
      {/* Top Bar with Drag Handle & Close */}
      <div className="relative pt-3 pb-2 px-6 flex items-center justify-between border-b border-neutral-800 shrink-0">
        <div className="w-12 h-1 bg-neutral-700 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2.5" />
        <div className="pt-2">
          <span className="text-[11px] font-medium tracking-[0.2em] uppercase text-neutral-400">
            Customise Order
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Close drawer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Dish Preview Header */}
      <div className="flex items-start gap-4 pb-4 border-b border-neutral-800">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover shrink-0 border border-neutral-800 shadow-sm"
          />
        ) : (
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-neutral-800 flex items-center justify-center text-neutral-400 shrink-0 border border-neutral-700">
            <Sparkles className="w-6 h-6" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
            {item.name}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-base sm:text-lg font-bold text-white">
              ₹{item.price}
            </span>
            <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-medium">
              Base Price
            </span>
          </div>
          {item.description && (
            <p className="text-xs sm:text-sm text-neutral-400 line-clamp-2 mt-1 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
