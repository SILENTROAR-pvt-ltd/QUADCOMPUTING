'use client';

import React from 'react';

const MAX = 50_000;
const STEP = 250;

/** Min/max nightly rate as two sliders (with exact numbers), kept in order. */
export function RateRange({ min, max, onChange }: { min: number; max: number; onChange: (min: number, max: number) => void }) {
  const num = (v: string) => Math.max(0, Math.min(MAX * 20, Math.round(Number(v) || 0)));
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm font-semibold">
        <span>₹{min.toLocaleString('en-IN')}</span><span className="text-xs font-normal text-[#2a1250]/50">per night</span><span>₹{max.toLocaleString('en-IN')}</span>
      </div>
      <label className="block">
        <span className="sr-only">Minimum rate</span>
        <input type="range" min={0} max={MAX} step={STEP} value={Math.min(min, MAX)} onChange={(e) => onChange(Math.min(num(e.target.value), max), max)} className="w-full accent-[#7c3aed]" />
      </label>
      <label className="block">
        <span className="sr-only">Maximum rate</span>
        <input type="range" min={0} max={MAX} step={STEP} value={Math.min(max, MAX)} onChange={(e) => onChange(min, Math.max(num(e.target.value), min))} className="w-full accent-[#ff2e88]" />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <input aria-label="Minimum rate in rupees" inputMode="numeric" className="rounded-xl border border-[#2a1250]/15 px-3 py-2 text-sm" value={min} onChange={(e) => onChange(num(e.target.value), Math.max(max, num(e.target.value)))} />
        <input aria-label="Maximum rate in rupees" inputMode="numeric" className="rounded-xl border border-[#2a1250]/15 px-3 py-2 text-sm" value={max} onChange={(e) => onChange(Math.min(min, num(e.target.value)), num(e.target.value))} />
      </div>
    </div>
  );
}
