'use client';

import React, { useState } from 'react';
import { Check, Plus, Tag } from 'lucide-react';
import type { RoomAddon } from '@/types';
import { addonTotal } from '@/lib/services/accommodation/stay-folio.util';
import { CheckInSection } from './CheckInSection';
import { CustomAddonForm } from './CustomAddonForm';

interface Props {
  availableAddons: RoomAddon[];
  chosenAddonIds: string[];
  toggleChosenAddon: (id: string) => void;
  onAddCustomAddon?: (addon: RoomAddon) => void;
  numNights: number;
  adultsCount: number;
}

const BILLING: Record<string, string> = { per_night: 'per night', per_person_per_day: 'per person per night', per_stay: 'per stay' };

/** Extras for the stay: the room type's add-ons to tick, each priced for these nights and guests, and one-off services. */
export function CheckInAddonsSection({ availableAddons, chosenAddonIds, toggleChosenAddon, onAddCustomAddon, numNights, adultsCount }: Props) {
  const [custom, setCustom] = useState(false);
  const chosen = chosenAddonIds.length;
  const forStay = (a: RoomAddon) => addonTotal(a.billingType === 'per_person_per_day' ? { ...a, persons: adultsCount } : a, numNights);

  return (
    <CheckInSection icon={Tag} title="Add-ons" hint={chosen ? `${chosen} chosen, on the room bill` : 'Optional extras, added to the room bill'}
      aside={onAddCustomAddon && (
        <button type="button" onClick={() => setCustom((v) => !v)} className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-50">
          <Plus className="h-3.5 w-3.5" aria-hidden /> {custom ? 'Cancel' : 'Custom'}
        </button>
      )}>
      <div className="space-y-3">
        {custom && onAddCustomAddon && <CustomAddonForm onAdd={onAddCustomAddon} onDone={() => setCustom(false)} />}
        {availableAddons.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-200 p-5 text-center text-xs text-neutral-500">No add-ons set up for this room type. Add a custom one if the guest needs something.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {availableAddons.map((a) => {
              const on = chosenAddonIds.includes(a.id);
              return (
                <li key={a.id}>
                  <button type="button" onClick={() => toggleChosenAddon(a.id)} aria-pressed={on}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-colors ${on ? 'border-neutral-950 bg-neutral-50' : 'border-neutral-200 bg-white hover:border-neutral-400'}`}>
                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${on ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-300 bg-white'}`}>{on && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-neutral-950">{a.name}</span>
                      <span className="block text-xs text-neutral-500">₹{Number(a.price).toLocaleString('en-IN')} {BILLING[a.billingType || 'per_stay']}</span>
                    </span>
                    <span className={`shrink-0 font-mono text-sm font-semibold ${on ? 'text-neutral-950' : 'text-neutral-500'}`}>₹{forStay(a).toLocaleString('en-IN')}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </CheckInSection>
  );
}
