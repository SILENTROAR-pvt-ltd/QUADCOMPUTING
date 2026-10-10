'use client';

import React from 'react';
import type { RoomAddon, RoomAddonBillingType } from '@/types';
import { Tag, Plus, Check } from 'lucide-react';

interface Props {
  customNameRef: React.RefObject<HTMLInputElement | null>;
  quickName: string;
  setQuickName: (val: string) => void;
  quickPrice: string;
  setQuickPrice: (val: string) => void;
  quickBillingType: RoomAddonBillingType;
  setQuickBillingType: (val: RoomAddonBillingType) => void;
  onAddQuickCustom: (e?: React.FormEvent) => void;
  onApplyTemplate: (tmpl: { name: string; price: number; billingType: RoomAddonBillingType }) => void;
  templates: { name: string; price: number; billingType: RoomAddonBillingType }[];
  addons: RoomAddon[];
}

export function AddonBuilderRow({
  customNameRef,
  quickName,
  setQuickName,
  quickPrice,
  setQuickPrice,
  quickBillingType,
  setQuickBillingType,
  onAddQuickCustom,
  onApplyTemplate,
  templates,
  addons
}: Props) {
  return (
    <>
      {/* Quick One-Click Template Chips */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
            One-Click Popular Suggestions
          </span>
          <span className="text-[10px] text-neutral-400">Click to instantly enable</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {templates.map((tmpl) => {
            const isAlreadyActive = addons.some(
              a => a.name.toLowerCase() === tmpl.name.toLowerCase() && a.isActive
            );
            return (
              <button
                key={tmpl.name}
                type="button"
                onClick={() => onApplyTemplate(tmpl)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${isAlreadyActive
                    ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                    : 'border-neutral-200/90 bg-white hover:border-neutral-300 text-neutral-700 hover:bg-neutral-50 shadow-2xs'
                  }`}
              >
                {isAlreadyActive ? (
                  <Check className="h-3.5 w-3.5 text-white" />
                ) : (
                  <Plus className="h-3.5 w-3.5 text-neutral-400" />
                )}
                <span>{tmpl.name}</span>
                <span className={`font-mono text-[11px] font-bold ${isAlreadyActive ? 'text-white/90' : 'text-neutral-900'}`}>₹{tmpl.price}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Custom Add-on Input Row */}
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/60 p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Tag className="h-3.5 w-3.5 text-neutral-500" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
            Custom Add-On Builder
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5">
            <input
              ref={customNameRef}
              type="text"
              placeholder="Add-on Name (e.g. Guided Trekking, Baby Cot)..."
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onAddQuickCustom();
                }
              }}
              className="w-full rounded-xl border border-neutral-200/90 bg-white px-3.5 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-900 shadow-2xs focus:ring-2 focus:ring-neutral-900/10"
            />
          </div>

          <div className="sm:col-span-3 relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400 text-xs font-semibold font-mono">
              ₹
            </span>
            <input
              type="number"
              min="0"
              step="10"
              placeholder="Price (₹)"
              value={quickPrice}
              onChange={(e) => setQuickPrice(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onAddQuickCustom();
                }
              }}
              className="w-full rounded-xl border border-neutral-200/90 bg-white pl-7 pr-3 py-2.5 text-xs font-mono font-medium text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-900 shadow-2xs focus:ring-2 focus:ring-neutral-900/10"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={quickBillingType}
              onChange={(e) => setQuickBillingType(e.target.value as RoomAddonBillingType)}
              className="w-full rounded-xl border border-neutral-200/90 bg-white px-3 py-2.5 text-xs text-neutral-700 outline-none focus:border-neutral-900 cursor-pointer shadow-2xs"
            >
              <option value="per_night">Per Night</option>
              <option value="per_person_per_day">Per Person / Day</option>
              <option value="per_stay">Per Stay</option>
            </select>
          </div>

          <div className="sm:col-span-1">
            <button
              type="button"
              onClick={() => onAddQuickCustom()}
              disabled={!quickName.trim()}
              className="w-full h-full min-h-[38px] rounded-xl bg-neutral-900 hover:bg-black disabled:opacity-40 text-white text-xs font-semibold flex items-center justify-center transition-all shadow-sm cursor-pointer active:scale-95"
              title="Add Custom Service"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
