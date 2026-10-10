'use client';

import React from 'react';

interface Props {
  splitCash: string;
  setSplitCash: (val: string) => void;
  splitOnline: string;
  setSplitOnline: (val: string) => void;
  grandTotal: number;
  splitSum: number;
  splitDiff: number;
}

export function TenderSplitView({
  splitCash,
  setSplitCash,
  splitOnline,
  setSplitOnline,
  grandTotal,
  splitSum,
  splitDiff
}: Props) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4 animate-in fade-in duration-200">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
            Cash Portion (₹)
          </label>
          <input
            type="number"
            value={splitCash}
            onChange={(e) => {
              const val = e.target.value;
              setSplitCash(val);
              const num = parseFloat(val) || 0;
              setSplitOnline(Math.max(0, grandTotal - num).toFixed(2));
            }}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 font-mono text-sm font-bold text-zinc-900 focus:bg-white focus:border-black focus:outline-hidden"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
            Online / Card Portion (₹)
          </label>
          <input
            type="number"
            value={splitOnline}
            onChange={(e) => {
              const val = e.target.value;
              setSplitOnline(val);
              const num = parseFloat(val) || 0;
              setSplitCash(Math.max(0, grandTotal - num).toFixed(2));
            }}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 font-mono text-sm font-bold text-zinc-900 focus:bg-white focus:border-black focus:outline-hidden"
          />
        </div>
      </div>

      <div className={`p-3 rounded-xl text-xs flex items-center justify-between ${
        Math.abs(splitDiff) <= 0.05
          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          : 'bg-rose-50 text-rose-800 border border-rose-200'
      }`}>
        <span>Total Allocated: ₹{splitSum.toFixed(2)} / ₹{grandTotal.toFixed(2)}</span>
        <span className="font-bold">
          {Math.abs(splitDiff) <= 0.05 ? 'Balanced ✓' : `Balance Remaining: ₹${splitDiff.toFixed(2)}`}
        </span>
      </div>
    </div>
  );
}
