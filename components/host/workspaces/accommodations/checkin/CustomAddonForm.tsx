'use client';

import React, { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { RoomAddon, RoomAddonBillingType } from '@/types';
import { CHEVRON, INPUT, SELECT } from './field-styles';

/** A service for this guest only (an airport pickup, an extra bed): named and priced here, added to the stay's bill. */
export function CustomAddonForm({ onAdd, onDone }: { onAdd: (addon: RoomAddon) => void; onDone: () => void }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [billing, setBilling] = useState<RoomAddonBillingType>('per_stay');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ id: `custom_checkin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name: name.trim(), price: Math.max(0, parseFloat(price) || 0), isActive: true, billingType: billing });
    onDone();
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50/80 p-3 sm:grid-cols-[1fr_120px_150px_44px]">
      <input type="text" required placeholder="Service, e.g. Airport pickup" value={name} onChange={(e) => setName(e.target.value)} className={`${INPUT} col-span-2 sm:col-span-1`} />
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-neutral-400">₹</span>
        <input type="number" min="0" step="50" required inputMode="numeric" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} className={`${INPUT} pl-7 font-mono`} />
      </div>
      <div className="relative">
        <select value={billing} onChange={(e) => setBilling(e.target.value as RoomAddonBillingType)} className={SELECT}>
          <option value="per_stay">Once per stay</option>
          <option value="per_night">Per night</option>
          <option value="per_person_per_day">Per person per night</option>
        </select>
        <ChevronDown className={CHEVRON} aria-hidden />
      </div>
      <button type="submit" aria-label="Add this service" className="col-span-2 grid h-11 cursor-pointer place-items-center rounded-xl bg-neutral-950 text-white hover:bg-neutral-800 sm:col-span-1"><Check className="h-4 w-4" aria-hidden /></button>
    </form>
  );
}
