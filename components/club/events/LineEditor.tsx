'use client';

import React from 'react';
import { Plus, X } from 'lucide-react';
import { field } from '../ui';

export interface Line { label: string; value: string }

/** A small list of "name + number" rows: budget lines (₹) or payment steps (%). */
export function LineEditor({ lines, onChange, unit, labelHint, max = 20 }: { lines: Line[]; onChange: (l: Line[]) => void; unit: '₹' | '%'; labelHint: string; max?: number }) {
  const update = (i: number, patch: Partial<Line>) => onChange(lines.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  return (
    <div className="space-y-2">
      {lines.map((l, i) => (
        <div key={i} className="flex gap-2">
          <input aria-label={`${labelHint} ${i + 1} name`} className={field} value={l.label} maxLength={60} placeholder={labelHint} onChange={(e) => update(i, { label: e.target.value })} />
          <span className="relative w-36 shrink-0">
            <span aria-hidden="true" className={`absolute inset-y-0 grid place-items-center text-sm text-[#2a1250]/45 ${unit === '₹' ? 'left-3' : 'right-3'}`}>{unit}</span>
            <input aria-label={`${labelHint} ${i + 1} ${unit === '₹' ? 'amount' : 'percent'}`} className={`${field} ${unit === '₹' ? 'pl-7' : 'pr-7'}`} inputMode="decimal"
              value={l.value} onChange={(e) => update(i, { value: e.target.value.replace(/[^\d.]/g, '') })} />
          </span>
          <button type="button" aria-label="Remove row" onClick={() => onChange(lines.filter((_, k) => k !== i))} className="grid w-9 shrink-0 place-items-center rounded-full text-[#2a1250]/45 hover:bg-[#2a1250]/[0.05]"><X className="h-4 w-4" /></button>
        </div>
      ))}
      {lines.length < max && (
        <button type="button" onClick={() => onChange([...lines, { label: '', value: '' }])} className="inline-flex items-center gap-1 text-xs font-semibold text-[#2a1250]/70 hover:text-[#2a1250]">
          <Plus className="h-3.5 w-3.5" /> Add a row
        </button>
      )}
    </div>
  );
}
