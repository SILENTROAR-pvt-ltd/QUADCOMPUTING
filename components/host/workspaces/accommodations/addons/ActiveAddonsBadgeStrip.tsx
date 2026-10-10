'use client';

import React from 'react';
import type { RoomAddon, RoomAddonBillingType } from '@/types';
import { PlusCircle, X } from 'lucide-react';

interface Props {
  activeAddons: RoomAddon[];
  billingTypeLabels: Record<RoomAddonBillingType, string>;
  onDeactivate: (id: string) => void;
}

export function ActiveAddonsBadgeStrip({
  activeAddons,
  billingTypeLabels,
  onDeactivate
}: Props) {
  if (activeAddons.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
        Active Add-Ons For This Category ({activeAddons.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {activeAddons.map((addon) => (
          <span
            key={addon.id}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 text-zinc-100 px-3.5 py-1.5 text-xs font-medium shadow-xs animate-in fade-in"
          >
            <PlusCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>{addon.name}</span>
            <span className="font-mono text-emerald-300 font-semibold">₹{addon.price}</span>
            <span className="text-[10px] text-zinc-400 font-sans">
              ({billingTypeLabels[addon.billingType]})
            </span>
            <button
              type="button"
              onClick={() => onDeactivate(addon.id)}
              className="rounded hover:bg-zinc-800 p-0.5 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="Remove from category"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
