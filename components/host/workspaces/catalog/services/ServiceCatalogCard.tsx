'use client';

import React from 'react';
import type { CatalogServiceItem, ServiceBillingDuration, ServiceProviderType } from './types';
import { Trash2 } from 'lucide-react';

interface Props {
  service: CatalogServiceItem;
  onToggle: (id: string) => void;
  onPriceChange: (id: string, price: number) => void;
  onDurationChange: (id: string, duration: ServiceBillingDuration) => void;
  onProviderChange: (id: string, provider: ServiceProviderType) => void;
  onRemoveCustom?: (id: string) => void;
}

export function ServiceCatalogCard({
  service,
  onToggle,
  onPriceChange,
  onDurationChange,
  onProviderChange,
  onRemoveCustom,
}: Props) {
  const isCustom = service.isCustom || service.id.startsWith('srv_custom_');

  return (
    <div
      className={`relative flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 ${
        service.isActive
          ? 'border-zinc-900 bg-zinc-50/70 shadow-xs'
          : 'border-zinc-200 bg-white hover:border-zinc-300'
      }`}
    >
      {/* Header row: Checkbox, Name, and Delete (for custom) */}
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={service.isActive}
            onChange={() => onToggle(service.id)}
            className="h-4 w-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 accent-zinc-950 cursor-pointer"
          />
          <span className={`text-xs font-semibold tracking-tight ${
            service.isActive ? 'text-zinc-950' : 'text-zinc-500'
          }`}>
            {service.name}
          </span>
        </label>

        <div className="flex items-center gap-1">
          {service.isActive && (
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
              Active
            </span>
          )}

          {isCustom && onRemoveCustom && (
            <button
              type="button"
              onClick={() => onRemoveCustom(service.id)}
              className="rounded-lg p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Delete custom service"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Body: Price Input & Billing Type Selector (when active) */}
      {service.isActive ? (
        <div className="mt-3.5 pt-3 border-t border-zinc-200/80 space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-zinc-400 text-xs font-bold font-mono">
                ₹
              </span>
              <input
                type="number"
                min="0"
                step="10"
                value={service.price}
                onChange={(e) => onPriceChange(service.id, Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full rounded-xl border border-zinc-200 bg-white pl-6 pr-2 py-1.5 text-xs font-mono font-medium text-zinc-900 outline-none focus:border-zinc-950"
                placeholder="Price"
              />
            </div>

            <select
              value={service.duration}
              onChange={(e) => onDurationChange(service.id, e.target.value as ServiceBillingDuration)}
              className="flex-1 rounded-xl border border-zinc-200 bg-white px-2 py-1.5 text-[11px] font-medium text-zinc-800 outline-none focus:border-zinc-950 cursor-pointer"
            >
              <option value="Per Session">Per Session</option>
              <option value="Per Day">Per Day</option>
              <option value="Per Stay">Per Stay</option>
              <option value="Per Person / Day">Per Person / Day</option>
              <option value="Per Hour">Per Hour</option>
              <option value="Per Night">Per Night</option>
            </select>
          </div>

          <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-0.5">
            <p className="italic">
              Billed at ₹{service.price} {service.duration.toLowerCase()}
            </p>
            <button
              type="button"
              onClick={() => onProviderChange(service.id, service.providerType === 'in_house' ? 'third_party' : 'in_house')}
              className="px-2 py-0.5 rounded-md border border-zinc-200 bg-white text-[9px] font-bold uppercase tracking-wider text-zinc-600 hover:text-black cursor-pointer shadow-2xs"
            >
              {service.providerType === 'in_house' ? 'In-House' : 'Vendor'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 pt-2 text-[11px] text-zinc-400 flex items-center justify-between">
          <span>Default: ₹{service.price}</span>
          <span className="text-[10px] uppercase tracking-wider">{service.duration}</span>
        </div>
      )}
    </div>
  );
}
