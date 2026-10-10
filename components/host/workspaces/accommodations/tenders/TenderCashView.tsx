'use client';

import React from 'react';

interface Props {
  cashTendered: string;
  setCashTendered: (val: string) => void;
  changeDue: number;
  grandTotal: number;
}

export function TenderCashView({
  cashTendered,
  setCashTendered,
  changeDue,
  grandTotal
}: Props) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4 animate-in fade-in duration-200">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
            Cash Tendered (₹)
          </label>
          <input
            type="number"
            value={cashTendered}
            onChange={(e) => setCashTendered(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 font-mono text-base font-bold text-zinc-900 focus:bg-white focus:border-black focus:outline-hidden"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
            Change Due to Guest
          </label>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5 font-mono text-base font-bold text-emerald-800">
            ₹{changeDue.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Quick Denominations */}
      <div>
        <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1.5">
          Quick Amount Denominations
        </span>
        <div className="flex flex-wrap gap-2">
          {[
            Math.ceil(grandTotal),
            Math.ceil(grandTotal / 500) * 500,
            Math.ceil(grandTotal / 1000) * 1000,
            Math.ceil(grandTotal / 2000) * 2000
          ]
            .filter((v, idx, arr) => arr.indexOf(v) === idx && v >= grandTotal)
            .map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setCashTendered(val.toString())}
                className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-mono font-medium hover:border-black hover:bg-white transition-colors cursor-pointer"
              >
                ₹{val.toLocaleString()}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
