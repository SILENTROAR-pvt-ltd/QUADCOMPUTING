'use client';

import React, { useState } from 'react';
import { Tag, Plus, Check, Sparkles, X } from 'lucide-react';
import type { RoomAddon, RoomAddonBillingType } from '@/types';

interface Props {
  availableAddons: RoomAddon[];
  chosenAddonIds: string[];
  toggleChosenAddon: (id: string) => void;
  onAddCustomAddon?: (addon: RoomAddon) => void;
  numNights: number;
  adultsCount: number;
}

export function CheckInAddonsSection({
  availableAddons,
  chosenAddonIds,
  toggleChosenAddon,
  onAddCustomAddon,
  numNights,
  adultsCount
}: Props) {
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customBillingType, setCustomBillingType] = useState<RoomAddonBillingType>('per_night');

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const priceNum = parseFloat(customPrice) || 0;
    const newAddon: RoomAddon = {
      id: `custom_checkin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: customName.trim(),
      price: Math.max(0, priceNum),
      isActive: true,
      billingType: customBillingType
    };

    if (onAddCustomAddon) {
      onAddCustomAddon(newAddon);
    }
    setCustomName('');
    setCustomPrice('');
    setCustomBillingType('per_night');
    setShowCustomForm(false);
  };

  const selectedList = availableAddons.filter(a => chosenAddonIds.includes(a.id));

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4 shadow-xs">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-zinc-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
            04. Available Stay Add-Ons & Services ({availableAddons.length})
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {chosenAddonIds.length > 0 && (
            <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold">
              {chosenAddonIds.length} Selected
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowCustomForm(!showCustomForm)}
            className="flex items-center gap-1 text-[11px] font-semibold text-zinc-700 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            {showCustomForm ? 'Cancel Custom' : 'Custom Add-On'}
          </button>
        </div>
      </div>

      {/* Inline Custom Add-On Creator */}
      {showCustomForm && (
        <form onSubmit={handleCreateCustom} className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-3.5 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-neutral-700" />
              Add Custom Service for this Guest
            </span>
            <span className="text-[10px] text-zinc-400">Attached to guest folio</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-5">
              <input
                type="text"
                required
                placeholder="Service Name (e.g. Airport Pickup, Extra Bedding)"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-950"
              />
            </div>

            <div className="sm:col-span-3 relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-zinc-400 text-xs font-bold font-mono">
                ₹
              </span>
              <input
                type="number"
                min="0"
                step="50"
                required
                placeholder="Price (₹)"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white pl-6 pr-2 py-2 text-xs font-mono font-medium text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-950"
              />
            </div>

            <div className="sm:col-span-3">
              <select
                value={customBillingType}
                onChange={(e) => setCustomBillingType(e.target.value as RoomAddonBillingType)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-2.5 py-2 text-xs text-zinc-800 outline-none focus:border-zinc-950 cursor-pointer"
              >
                <option value="per_night">Per Night</option>
                <option value="per_person_per_day">Per Person / Day</option>
                <option value="per_stay">Per Stay (Flat)</option>
              </select>
            </div>

            <div className="sm:col-span-1">
              <button
                type="submit"
                className="w-full h-full min-h-[34px] rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold flex items-center justify-center transition-colors shadow-xs cursor-pointer"
                title="Add and Select Service"
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Selected Add-Ons Active Strip */}
      {selectedList.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-emerald-50/60 border border-emerald-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 self-center mr-1">
            Opted Add-Ons:
          </span>
          {selectedList.map(a => {
            const calculatedTotal = a.billingType === 'per_night'
              ? (Number(a.price) || 0) * numNights
              : a.billingType === 'per_person_per_day'
              ? (Number(a.price) || 0) * numNights * Math.max(1, adultsCount)
              : (Number(a.price) || 0);

            return (
              <span
                key={a.id}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-950 shadow-xs"
              >
                <span>{a.name}</span>
                <span className="font-mono font-bold text-emerald-700">₹{calculatedTotal.toLocaleString()}</span>
                <button
                  type="button"
                  onClick={() => toggleChosenAddon(a.id)}
                  className="rounded p-0.5 text-emerald-600 hover:text-rose-600 transition-colors ml-0.5 cursor-pointer"
                  title="Remove addon"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Grid of Addons */}
      {availableAddons.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-xs text-zinc-400">
          No add-on services loaded. Click &ldquo;+ Custom Add-On&rdquo; above to add on the fly.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
          {availableAddons.map((addon) => {
            const isSelected = chosenAddonIds.includes(addon.id);
            const billingLabel = addon.billingType === 'per_night' 
              ? '/ night' 
              : addon.billingType === 'per_person_per_day' 
              ? '/ person / day' 
              : 'flat';

            const calculatedTotal = addon.billingType === 'per_night'
              ? (Number(addon.price) || 0) * numNights
              : addon.billingType === 'per_person_per_day'
              ? (Number(addon.price) || 0) * numNights * Math.max(1, adultsCount)
              : (Number(addon.price) || 0);

            return (
              <div
                key={addon.id}
                onClick={() => toggleChosenAddon(addon.id)}
                className={`flex items-center justify-between rounded-xl border p-3 cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'border-zinc-950 bg-zinc-50 shadow-xs'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}} // parent onClick handles toggle
                    className="h-4 w-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 accent-zinc-950 cursor-pointer shrink-0"
                  />
                  <div className="truncate">
                    <span className={`text-xs font-semibold block truncate ${isSelected ? 'text-zinc-950' : 'text-zinc-700'}`}>
                      {addon.name}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] text-emerald-700 font-mono font-medium block">
                        ₹{calculatedTotal.toLocaleString()} for this stay
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-mono font-bold text-zinc-950">₹{addon.price}</span>
                  <span className="text-[10px] text-zinc-400 block">{billingLabel}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
