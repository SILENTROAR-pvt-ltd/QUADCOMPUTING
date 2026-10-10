'use client';

import React from 'react';
import type { 
  CatalogServiceItem, 
  ServiceQuickTemplate, 
  ServiceCategory, 
  ServiceBillingDuration 
} from './types';
import { Tag, Plus, Check } from 'lucide-react';

interface Props {
  customNameRef: React.RefObject<HTMLInputElement | null>;
  quickName: string;
  setQuickName: (val: string) => void;
  quickPrice: string;
  setQuickPrice: (val: string) => void;
  quickCategory: ServiceCategory;
  setQuickCategory: (val: ServiceCategory) => void;
  quickDuration: ServiceBillingDuration;
  setQuickDuration: (val: ServiceBillingDuration) => void;
  onAddQuickCustom: (e?: React.FormEvent) => void;
  onApplyTemplate: (tmpl: ServiceQuickTemplate) => void;
  templates: ServiceQuickTemplate[];
  services: CatalogServiceItem[];
}

export function ServiceBuilderRow({
  customNameRef,
  quickName,
  setQuickName,
  quickPrice,
  setQuickPrice,
  quickCategory,
  setQuickCategory,
  quickDuration,
  setQuickDuration,
  onAddQuickCustom,
  onApplyTemplate,
  templates,
  services,
}: Props) {
  return (
    <>
      {/* Quick One-Click Template Chips */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            One-Click Popular Suggestions
          </span>
          <span className="text-[10px] text-zinc-400">Click to instantly enable</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {templates.map((tmpl) => {
            const isAlreadyActive = services.some(
              (s) => s.name.toLowerCase() === tmpl.name.toLowerCase() && s.isActive
            );
            return (
              <button
                key={tmpl.name}
                type="button"
                onClick={() => onApplyTemplate(tmpl)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  isAlreadyActive
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                    : 'border-zinc-200 bg-white hover:border-zinc-300 text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                {isAlreadyActive ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Plus className="h-3.5 w-3.5 text-zinc-400" />
                )}
                <span>{tmpl.name}</span>
                <span className="font-mono text-[11px] font-bold">₹{tmpl.price}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Custom Add-on Input Row */}
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/70 p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Tag className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">
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
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-950"
            />
          </div>

          <div className="sm:col-span-3 relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400 font-mono text-xs">
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
              className="w-full rounded-xl border border-zinc-200 bg-white pl-7 pr-3 py-2.5 text-xs font-mono text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-950"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={quickDuration}
              onChange={(e) => setQuickDuration(e.target.value as ServiceBillingDuration)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs text-zinc-800 outline-none focus:border-zinc-950 cursor-pointer"
            >
              <option value="Per Session">Per Session</option>
              <option value="Per Day">Per Day</option>
              <option value="Per Stay">Per Stay</option>
              <option value="Per Person / Day">Per Person / Day</option>
              <option value="Per Night">Per Night</option>
              <option value="Per Hour">Per Hour</option>
            </select>
          </div>

          <div className="sm:col-span-1">
            <button
              type="button"
              onClick={() => onAddQuickCustom()}
              disabled={!quickName.trim()}
              className="w-full h-full min-h-[38px] flex items-center justify-center rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 disabled:opacity-40 transition-colors cursor-pointer"
              title="Add add-on to list"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
