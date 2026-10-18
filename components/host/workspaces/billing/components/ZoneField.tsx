'use client';

import React, { useId } from 'react';

export const FORM_INPUT = 'w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 shadow-sm transition-all focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300 placeholder:text-neutral-400';

interface Props {
  value: string;
  onChange: (zone: string) => void;
  /** The areas the venue already has, offered as one-tap choices and as suggestions while typing. */
  zones: string[];
  label?: string;
  /** A smaller field, for inside a table's own card. */
  compact?: boolean;
}

/** An optional area for a table ("Ground floor", "First floor", "Riverside"): type a new one, or tap one the venue already has. */
export function ZoneField({ value, onChange, zones, label = 'Area (optional)', compact = false }: Props) {
  const listId = useId();
  const input = compact
    ? 'w-full rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-900 focus:outline-none focus:border-neutral-400'
    : FORM_INPUT;
  return (
    <div>
      {!compact && <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-neutral-400">{label}</label>}
      <input value={value} onChange={(e) => onChange(e.target.value)} list={listId} maxLength={40} aria-label={label}
        placeholder={compact ? 'Area (optional)' : 'e.g. Ground floor, First floor, Riverside'} className={input} />
      <datalist id={listId}>{zones.map((z) => <option key={z} value={z} />)}</datalist>
      {!compact && zones.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Existing areas">
          {zones.map((z) => (
            <button key={z} type="button" aria-pressed={value.trim().toLowerCase() === z.toLowerCase()} onClick={() => onChange(value.trim().toLowerCase() === z.toLowerCase() ? '' : z)}
              className={`cursor-pointer rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${value.trim().toLowerCase() === z.toLowerCase() ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400 hover:text-neutral-900'}`}>
              {z}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
