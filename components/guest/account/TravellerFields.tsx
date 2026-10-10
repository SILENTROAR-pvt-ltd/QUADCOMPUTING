'use client';

import React from 'react';
import { TRAVELLER_TYPES, INTRO_MAX, type TravellerTypeId } from '@/lib/guest/traveller-types';

interface TravellerFieldsProps {
  travellerType: TravellerTypeId | null;
  onTravellerType: (value: TravellerTypeId | null) => void;
  intro: string;
  onIntro: (value: string) => void;
  /** Shown as the intro placeholder, so the guest sees the kind of line they can write. */
  introPlaceholder?: string;
}

/** Traveller type (one choice, optional) and a one-line intro, shared by sign-up and the profile. */
export function TravellerFields({ travellerType, onTravellerType, intro, onIntro, introPlaceholder }: TravellerFieldsProps) {
  const selected = TRAVELLER_TYPES.find((t) => t.id === travellerType) ?? null;

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-medium text-zinc-600">How do you travel?</span>
          <span className="text-[10px] text-zinc-400">Optional</span>
        </div>
        <div role="radiogroup" aria-label="Traveller type" className="mt-1.5 grid grid-cols-2 gap-2">
          {TRAVELLER_TYPES.map((t) => {
            const active = t.id === travellerType;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onTravellerType(active ? null : t.id)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                  active ? 'border-zinc-900 bg-zinc-950 text-white' : 'border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400'
                }`}
              >
                <span aria-hidden="true" className="text-base leading-none">{t.emoji}</span>
                <span className="min-w-0 font-medium leading-tight">{t.label}</span>
              </button>
            );
          })}
        </div>
        {selected && <p className="mt-1.5 text-[11px] text-zinc-500">{selected.hint}</p>}
      </div>

      <label className="block">
        <span className="flex items-baseline justify-between gap-2 text-[11px] font-medium text-zinc-600">
          <span>Your intro <span className="font-normal text-zinc-400">· shown on your profile</span></span>
          <span className={`text-[10px] tabular-nums ${intro.length >= INTRO_MAX ? 'text-amber-600' : 'text-zinc-400'}`}>{intro.length}/{INTRO_MAX}</span>
        </span>
        <input
          type="text"
          value={intro}
          maxLength={INTRO_MAX}
          onChange={(e) => onIntro(e.target.value)}
          placeholder={introPlaceholder ?? 'One line about you, e.g. here for the dosa, not the view'}
          className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white focus:outline-none transition-all"
        />
      </label>
    </div>
  );
}

export default TravellerFields;
