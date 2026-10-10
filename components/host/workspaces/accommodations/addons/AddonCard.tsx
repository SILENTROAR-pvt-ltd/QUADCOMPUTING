'use client';

import React from 'react';
import type { RoomAddon, RoomAddonBillingType } from '@/types';
import { Trash2 } from 'lucide-react';

interface Props {
  addon: RoomAddon;
  billingTypeLabels: Record<RoomAddonBillingType, string>;
  onToggle: (id: string) => void;
  onPriceChange: (id: string, newPrice: string) => void;
  onBillingTypeChange: (id: string, billingType: RoomAddonBillingType) => void;
  onRemoveCustom: (id: string) => void;
}

export function AddonCard({
  addon,
  billingTypeLabels,
  onToggle,
  onPriceChange,
  onBillingTypeChange,
  onRemoveCustom
}: Props) {
  const isCustom = addon.id.startsWith('custom_');

  return (
    <div
      className={`relative flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 ${addon.isActive
          ? 'border-neutral-900 bg-neutral-50/50 shadow-2xs'
          : 'border-neutral-200/90 bg-white hover:border-neutral-300 shadow-2xs'
        }`}
    >
      {/* Header row: Checkbox, Name, and Delete (for custom) */}
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={addon.isActive}
            onChange={() => onToggle(addon.id)}
            className="h-4 w-4 rounded border-neutral-300 text-neutral-950 focus:ring-neutral-950 accent-neutral-950 cursor-pointer"
          />
          <span className={`text-xs font-semibold tracking-tight ${addon.isActive ? 'text-neutral-950' : 'text-neutral-500'
            }`}>
            {addon.name}
          </span>
        </label>

        <div className="flex items-center gap-1">
          {addon.isActive && (
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-700">
              Active
            </span>
          )}

          {isCustom && (
            <button
              type="button"
              onClick={() => onRemoveCustom(addon.id)}
              className="rounded-lg p-1 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Delete custom add-on"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Body: Price Input & Billing Type Selector (when active) */}
      {addon.isActive ? (
        <div className="mt-3.5 pt-3 border-t border-neutral-200/80 space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-neutral-400 text-xs font-semibold font-mono">
                ₹
              </span>
              <input
                type="number"
                min="0"
                step="10"
                value={addon.price}
                onChange={(e) => onPriceChange(addon.id, e.target.value)}
                className="w-full rounded-xl border border-neutral-200/90 bg-white pl-6 pr-2 py-1.5 text-xs font-mono font-medium text-neutral-900 outline-none focus:border-neutral-900 shadow-2xs"
                placeholder="Price"
              />
            </div>

            <select
              value={addon.billingType}
              onChange={(e) => onBillingTypeChange(addon.id, e.target.value as RoomAddonBillingType)}
              className="flex-1 rounded-xl border border-neutral-200/90 bg-white px-2 py-1.5 text-[11px] font-medium text-neutral-800 outline-none focus:border-neutral-900 cursor-pointer shadow-2xs"
            >
              <option value="per_night">Per Night</option>
              <option value="per_person_per_day">Per Person / Day</option>
              <option value="per_stay">Per Stay</option>
            </select>
          </div>

          <p className="text-[10px] text-neutral-400">
            Billed at ₹{addon.price} {billingTypeLabels[addon.billingType].toLowerCase()}
          </p>
        </div>
      ) : (
        <div className="mt-3 pt-2 text-[11px] text-neutral-400 flex items-center justify-between">
          <span>Default: ₹{addon.price}</span>
          <span className="text-[10px] font-medium uppercase tracking-wider">{billingTypeLabels[addon.billingType]}</span>
        </div>
      )}
    </div>
  );
}
