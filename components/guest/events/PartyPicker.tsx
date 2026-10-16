'use client';

import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { MAX_PARTY, type PartyMix, type SeatsLeft } from '@/lib/services/live-events/party';

const ROWS: Array<{ key: keyof PartyMix; label: string }> = [
  { key: 'male', label: 'Men' },
  { key: 'female', label: 'Women' },
  { key: 'other', label: 'Other' },
];

/** Who is coming: a counter each for men, women and other, up to ten, stopping at the seats the event has left. */
export function PartyPicker({ mix, onChange, left }: { mix: PartyMix; onChange: (m: PartyMix) => void; left: SeatsLeft }) {
  const size = mix.male + mix.female + mix.other;
  const room = Math.min(MAX_PARTY, left.total ?? MAX_PARTY);
  const limit = (key: keyof PartyMix): number | null => (key === 'male' ? left.male : key === 'female' ? left.female : null);
  const canAdd = (key: keyof PartyMix) => size < room && (limit(key) === null || mix[key] < (limit(key) as number));

  return (
    <fieldset className="space-y-2">
      <legend className="text-[12px] font-semibold text-zinc-700">Who is coming <span className="font-normal text-zinc-400">(up to {MAX_PARTY})</span></legend>
      {ROWS.map((r) => {
        const cap = limit(r.key);
        return (
          <div key={r.key} className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-3 py-2">
            <div>
              <span className="text-sm text-zinc-800">{r.label}</span>
              {cap !== null && <span className="ml-2 text-[11px] text-zinc-400">{cap} {cap === 1 ? 'seat' : 'seats'} left</span>}
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => onChange({ ...mix, [r.key]: Math.max(0, mix[r.key] - 1) })} disabled={mix[r.key] === 0} aria-label={`Fewer ${r.label}`}
                className="grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-zinc-200 text-zinc-700 disabled:opacity-30"><Minus className="h-4 w-4" /></button>
              <span aria-live="polite" className="w-5 text-center text-base font-semibold tabular-nums">{mix[r.key]}</span>
              <button type="button" onClick={() => onChange({ ...mix, [r.key]: mix[r.key] + 1 })} disabled={!canAdd(r.key)} aria-label={`More ${r.label}`}
                className="grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-[#0A3222] text-white disabled:opacity-30"><Plus className="h-4 w-4" /></button>
            </div>
          </div>
        );
      })}
      <p className="text-[11.5px] text-zinc-500" aria-live="polite">
        {size === 0 ? 'Add the people coming.' : `${size} ${size === 1 ? 'guest' : 'guests'}: ${mix.male} men, ${mix.female} women${mix.other ? `, ${mix.other} other` : ''}`}
      </p>
    </fieldset>
  );
}
