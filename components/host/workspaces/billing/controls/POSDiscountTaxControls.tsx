'use client';

import React from 'react';

interface Props {
  discountType: 'percentage' | 'flat';
  setDiscountType: (type: 'percentage' | 'flat') => void;
  discountInputValue: string;
  setDiscountInputValue: (val: string) => void;
  gstEnabled: boolean;
  setGstEnabled: (enabled: boolean) => void;
  /** False until the venue has a verified GSTIN in My profile; the switch is locked off. */
  gstAllowed: boolean;
  gstReason: string | null;
}

export function POSDiscountTaxControls({
  discountType,
  setDiscountType,
  discountInputValue,
  setDiscountInputValue,
  gstEnabled,
  setGstEnabled,
  gstAllowed,
  gstReason,
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
              className={`h-8 min-w-9 rounded-md px-2.5 text-[12px] font-bold tracking-wider transition-colors cursor-pointer ${
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
              className={`h-8 min-w-9 rounded-md px-2.5 text-[12px] font-bold tracking-wider transition-colors cursor-pointer ${
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
          <span className="pointer-events-none absolute left-4 top-3 text-zinc-400 font-mono text-sm font-bold">
            {discountType === 'flat' ? '₹' : '%'}
          </span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            value={discountInputValue}
            onChange={(e) => setDiscountInputValue(e.target.value)}
            placeholder="0.00"
            className="w-full h-11 rounded-xl border border-zinc-200 bg-white pl-8 pr-4 font-mono text-[16px] sm:text-sm text-zinc-900 shadow-sm transition-all focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>
      </div>

      <div className="flex flex-col justify-between">
        <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-zinc-500">
          GST Tax Setting
        </label>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 min-h-11">
          <div>
            <p className="font-medium text-xs text-black">Apply GST</p>
            <p className="text-[10px] text-zinc-400">
              {gstAllowed ? '5% food · 18% services, after discount' : gstReason || 'Checking your GST setup…'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={gstEnabled}
            aria-label="Apply GST"
            disabled={!gstAllowed}
            title={gstAllowed ? undefined : gstReason || undefined}
            onClick={() => setGstEnabled(!gstEnabled)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
              gstEnabled ? 'bg-black' : 'bg-zinc-300'
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                gstEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
