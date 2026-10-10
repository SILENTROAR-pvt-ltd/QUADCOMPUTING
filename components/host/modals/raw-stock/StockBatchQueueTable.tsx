'use client';

import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { BatchIngestItem } from './raw-stock.types';

interface StockBatchQueueTableProps {
  selectedBatch: BatchIngestItem[];
  totalBatchValuation: number;
  onUpdateBatchItem: (id: string, field: keyof BatchIngestItem, value: any) => void;
  onRemoveBatchItem: (id: string) => void;
}

const inr2 = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const input = 'h-8 rounded-lg border border-neutral-200 bg-white px-2 text-right font-mono text-xs outline-none focus:border-neutral-900';
const lbl = 'text-[10px] font-semibold text-neutral-500';

/** The items about to be added, each with opening quantity, cost, reorder level and tracking. */
export function StockBatchQueueTable({ selectedBatch, totalBatchValuation, onUpdateBatchItem, onRemoveBatchItem }: StockBatchQueueTableProps) {
  if (selectedBatch.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
        <p className="text-sm font-medium text-neutral-800">Nothing selected yet</p>
        <p className="mt-0.5 text-xs text-neutral-500">Pick common items above, or enter your own below.</p>
      </div>
    );
  }
  const step = (item: BatchIngestItem, d: number) =>
    onUpdateBatchItem(item.id, 'quantity', String(Math.max(0, (parseFloat(item.quantity) || 0) + d)));

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">To add ({selectedBatch.length})</h3>
        <span className="font-mono text-xs font-semibold text-neutral-900">Opening value {inr2(totalBatchValuation)}</span>
      </div>
      <ul className="max-h-72 divide-y divide-neutral-100 overflow-y-auto rounded-2xl border border-neutral-200">
        {selectedBatch.map((item) => {
          const line = (parseFloat(item.quantity) || 0) * (parseFloat(item.costPerUnit) || 0);
          return (
            <li key={item.id} className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-[150px] items-center gap-2.5">
                <span className="text-xl" aria-hidden>{item.icon}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-950">{item.name}</p>
                  <p className="truncate text-[11px] text-neutral-500">{item.category} · {item.unit}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-end justify-end gap-3">
                <label className="flex flex-col gap-0.5"><span className={lbl}>Opening ({item.unit})</span>
                  <span className="flex items-center">
                    <button type="button" aria-label="Less" onClick={() => step(item, -1)} className="flex h-8 w-7 items-center justify-center rounded-l-lg border border-r-0 border-neutral-200 hover:bg-neutral-50 cursor-pointer"><Minus className="h-3 w-3" /></button>
                    <input type="number" min={0} step="any" value={item.quantity} onChange={(e) => onUpdateBatchItem(item.id, 'quantity', e.target.value)} className={`${input} w-20 rounded-none`} />
                    <button type="button" aria-label="More" onClick={() => step(item, 1)} className="flex h-8 w-7 items-center justify-center rounded-r-lg border border-l-0 border-neutral-200 hover:bg-neutral-50 cursor-pointer"><Plus className="h-3 w-3" /></button>
                  </span>
                </label>
                <label className="flex flex-col gap-0.5"><span className={lbl}>Cost / {item.unit} (₹)</span>
                  <input type="number" min={0} step="any" value={item.costPerUnit} onChange={(e) => onUpdateBatchItem(item.id, 'costPerUnit', e.target.value)} className={`${input} w-24`} /></label>
                <label className="flex flex-col gap-0.5"><span className={lbl}>Reorder at</span>
                  <input type="number" min={0} step="any" value={item.threshold} onChange={(e) => onUpdateBatchItem(item.id, 'threshold', e.target.value)} className={`${input} w-16`} /></label>
                <div className="flex min-w-[80px] flex-col items-end"><span className={lbl}>Value</span><span className="font-mono text-xs font-semibold text-neutral-950">{inr2(line)}</span></div>
                <button type="button" onClick={() => onUpdateBatchItem(item.id, 'isCritical', !item.isCritical)} aria-pressed={item.isCritical}
                  title="High-value items appear in quick daily counts"
                  className={`h-8 rounded-lg border px-2 text-[11px] font-semibold cursor-pointer ${item.isCritical ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}>
                  {item.isCritical ? 'High-value' : 'Standard'}
                </button>
                <button type="button" onClick={() => onRemoveBatchItem(item.id)} aria-label={`Remove ${item.name}`} className="rounded-lg p-2 text-neutral-400 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
