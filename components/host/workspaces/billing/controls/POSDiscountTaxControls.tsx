'use client';

import React from 'react';

interface Props {
  discountType: 'percentage' | 'flat';
  setDiscountType: (type: 'percentage' | 'flat') => void;
  discountInputValue: string;
  setDiscountInputValue: (val: string) => void;
  gstEnabled: boolean;
  setGstEnabled: (enabled: boolean) => void;
}

export function POSDiscountTaxControls({
  discountType,
  setDiscountType,
  discountInputValue,
  setDiscountInputValue,
  gstEnabled,
  setGstEnabled,
}: Props) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 pt-1">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Apply Discount
          </label>
          <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
            <button
              type="button"
              onClick={() => setDiscountType('percentage')}
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider transition-colors cursor-pointer ${
                discountType === 'percentage'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-zinc-500 hover:text-black'
              }`}
            >
              %
            </button>
            <button
              type="button"
              onClick={() => setDiscountType('flat')}
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider transition-colors cursor-pointer ${
                discountType === 'flat'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-zinc-500 hover:text-black'
              }`}
            >
              ₹
            </button>
          </div>
        </div>
        <div className="relative">
          <span className="absolute left-4 top-3 text-zinc-400 font-mono text-xs font-bold">
            {discountType === 'flat' ? '₹' : '%'}
          </span>
          <input
            type="number"
            value={discountInputValue}
            onChange={(e) => setDiscountInputValue(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-xl border border-zinc-200 bg-white pl-8 pr-4 py-2.5 font-mono text-xs text-zinc-900 shadow-sm transition-all focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>
      </div>

      <div className="flex flex-col justify-between">
        <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-zinc-500">
          GST Tax Setting
        </label>
        <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-2.5">
          <div>
            <p className="font-medium text-xs text-black">Apply GST</p>
            <p className="text-[10px] text-zinc-400">5% food · 18% services, after discount</p>
          </div>
          <button
            type="button"
            onClick={() => setGstEnabled(!gstEnabled)}
            className={`relative h-5 w-10 rounded-full transition-colors cursor-pointer ${
              gstEnabled ? 'bg-black' : 'bg-zinc-300'
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                gstEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
