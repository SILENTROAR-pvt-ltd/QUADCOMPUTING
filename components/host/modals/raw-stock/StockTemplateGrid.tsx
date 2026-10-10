'use client';

import React from 'react';
import { RotateCcw, Check } from 'lucide-react';
import { CriticalStockTemplate, BatchIngestItem } from './raw-stock.types';
import { CRITICAL_STOCK_TEMPLATES } from './raw-stock.constants';

interface StockTemplateGridProps {
  selectedBatch: BatchIngestItem[];
  onToggleTemplate: (template: CriticalStockTemplate) => void;
  onSelectAll: () => void;
  onClear: () => void;
}

const smallBtn = 'inline-flex h-8 items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer';

/** Common kitchen items to pick in one tap; each lands in the list below to adjust. */
export function StockTemplateGrid({ selectedBatch, onToggleTemplate, onSelectAll, onClear }: StockTemplateGridProps) {
  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">Common items</h3>
          <p className="text-xs text-neutral-500">Tap to add; set quantity and cost below.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onSelectAll} className={smallBtn}>Select all ({CRITICAL_STOCK_TEMPLATES.length})</button>
          {selectedBatch.length > 0 && <button type="button" onClick={onClear} className={smallBtn}><RotateCcw className="h-3 w-3" /> Clear</button>}
        </div>
      </div>

      <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-5">
        {CRITICAL_STOCK_TEMPLATES.map((t) => {
          const picked = selectedBatch.find((b) => b.id === t.id);
          return (
            <button key={t.id} type="button" aria-pressed={Boolean(picked)} onClick={() => onToggleTemplate(t)}
              className={`relative flex flex-col items-start rounded-2xl border p-2.5 text-left transition-colors cursor-pointer ${picked ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900' : 'border-neutral-200 bg-white hover:border-neutral-300'}`}>
              <div className="flex w-full items-center justify-between">
                <span className="text-xl" aria-hidden>{t.icon}</span>
                <span className={`flex h-4 w-4 items-center justify-center rounded-md border ${picked ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 text-transparent'}`}>
                  <Check className="h-3 w-3 stroke-[3]" />
                </span>
              </div>
              <span className="mt-1.5 w-full truncate text-xs font-semibold text-neutral-950">{t.name}</span>
              <span className="w-full truncate text-[10px] text-neutral-500">{t.category.split('&')[0].trim()}</span>
              <span className="mt-1.5 rounded-md bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] text-neutral-700">
                {picked ? `${picked.quantity} ${t.unit} · ₹${picked.costPerUnit}` : `₹${t.defaultCost}/${t.unit}`}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
