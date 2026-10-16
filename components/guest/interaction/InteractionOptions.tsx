'use client';

import React from 'react';

export type InteractionType = 'coffee' | 'join' | 'message';

const OPTIONS: Array<{ type: InteractionType; label: string; desc: string }> = [
  { type: 'coffee', label: 'Invite for Coffee', desc: 'Treat or offer a coffee/drink' },
  { type: 'join', label: 'Join Request', desc: 'Ask to join tables or have a quick chat' },
  { type: 'message', label: 'Custom Note', desc: 'Send a direct short message' },
];

/** The three ways to reach another table, as a list of choices with the chosen one marked. */
export function InteractionOptions({ value, onChange }: { value: InteractionType; onChange: (t: InteractionType) => void }) {
  return (
    <div role="radiogroup" aria-label="How to connect" className="space-y-2">
      {OPTIONS.map((opt) => {
        const on = value === opt.type;
        return (
          <button key={opt.type} type="button" role="radio" aria-checked={on} onClick={() => onChange(opt.type)}
            className={`flex w-full cursor-pointer items-center justify-between rounded-2xl border p-3.5 text-left transition-colors active:scale-[0.99] ${on ? 'border-black bg-zinc-50' : 'border-zinc-200 bg-white hover:border-zinc-300'}`}>
            <div>
              <p className="text-sm font-medium text-black">{opt.label}</p>
              <p className="text-xs font-light text-zinc-500">{opt.desc}</p>
            </div>
            {on && <div className="h-2 w-2 rounded-full bg-black" />}
          </button>
        );
      })}
    </div>
  );
}
