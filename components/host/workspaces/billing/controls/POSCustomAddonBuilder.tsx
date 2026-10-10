'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';

interface Props {
  onAddCustomItem?: (name: string, price: number) => void;
  setCustomAmount?: (val: string) => void;
}

export function POSCustomAddonBuilder({ onAddCustomItem, setCustomAmount }: Props) {
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');

  const handleCustomSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = customItemName.trim();
    const price = parseFloat(customItemPrice);

    if (!name || isNaN(price) || price <= 0) return;

    if (onAddCustomItem) {
      onAddCustomItem(name, price);
    } else if (setCustomAmount) {
      setCustomAmount(price.toString());
    }

    setCustomItemName('');
    setCustomItemPrice('');
  };

  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-zinc-50/60 p-4 sm:p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700">
            <Plus className="h-3.5 w-3.5" />
          </span>
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800">
            Custom Entry / Ad-Hoc Add-on (₹)
          </h4>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Instant Bill</span>
      </div>
      <p className="text-[11px] text-zinc-500 mb-3.5">
        Instantly add unlisted charges, rentals, or penalty fees directly to the active guest folio.
      </p>

      {/* Dual Input Form */}
      <form onSubmit={handleCustomSubmit} className="grid gap-2 sm:grid-cols-12 items-center">
        <div className="sm:col-span-6">
          <input
            type="text"
            value={customItemName}
            onChange={(e) => setCustomItemName(e.target.value)}
            placeholder="Description (e.g. Rental Bike, Airport Cab)..."
            className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs text-zinc-900 shadow-sm transition-all focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-200 placeholder:text-zinc-400"
          />
        </div>
        <div className="sm:col-span-3 relative">
          <span className="absolute left-3 top-2.5 text-zinc-400 font-mono text-xs font-bold">₹</span>
          <input
            type="number"
            step="any"
            min="0"
            value={customItemPrice}
            onChange={(e) => setCustomItemPrice(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-xl border border-zinc-200 bg-white pl-7 pr-3 py-2.5 font-mono text-xs text-zinc-900 shadow-sm transition-all focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-200 placeholder:text-zinc-400"
          />
        </div>
        <div className="sm:col-span-3">
          <button
            type="submit"
            disabled={!customItemName.trim() || !customItemPrice || parseFloat(customItemPrice) <= 0}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-medium text-zinc-800 shadow-sm transition-all hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add to Bill</span>
          </button>
        </div>
      </form>
    </div>
  );
}
