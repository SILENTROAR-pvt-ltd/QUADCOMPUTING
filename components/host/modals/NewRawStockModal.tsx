'use client';

import React, { useEffect } from 'react';
import { X, AlertTriangle, PackagePlus } from 'lucide-react';
import { StockTemplateGrid } from './raw-stock/StockTemplateGrid';
import { StockBatchQueueTable } from './raw-stock/StockBatchQueueTable';
import { StockCustomItemForm } from './raw-stock/StockCustomItemForm';
import { useRawStockBatch } from './raw-stock/hooks/useRawStockBatch';
import {
  CriticalStockTemplate,
  BatchIngestItem,
  NewRawStockModalProps,
  calculateBatchValuation,
  validateBatchItem,
} from './raw-stock/raw-stock.types';
import { CRITICAL_STOCK_TEMPLATES, INVENTORY_CATEGORIES, INVENTORY_UNITS } from './raw-stock/raw-stock.constants';

export type { CriticalStockTemplate, BatchIngestItem };
export { CRITICAL_STOCK_TEMPLATES, INVENTORY_CATEGORIES, INVENTORY_UNITS, calculateBatchValuation, validateBatchItem };

const inr2 = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Add stock items in one go: pick common items or enter your own, with opening quantity and cost. */
export function NewRawStockModal({ onClose, onSuccess }: NewRawStockModalProps) {
  const b = useRawStockBatch(onSuccess, onClose);
  const n = b.selectedBatch.length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/30 p-3 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Add stock items" onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white text-neutral-900 shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-neutral-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-700"><PackagePlus className="h-5 w-5" /></div>
            <div>
              <h2 className="font-serif text-2xl text-neutral-950">Add stock items</h2>
              <p className="text-xs text-neutral-500">Opening quantities are recorded on each item&apos;s stock card at the cost you enter.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {n > 0 && <span className="rounded-full bg-neutral-950 px-2.5 py-0.5 text-[11px] font-semibold text-white">{n} selected</span>}
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 cursor-pointer"><X className="h-5 w-5" /></button>
          </div>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {b.error && (
            <p role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />{b.error}
            </p>
          )}
          <StockTemplateGrid selectedBatch={b.selectedBatch} onToggleTemplate={b.handleToggleTemplate} onSelectAll={b.handleSelectAllTemplates} onClear={b.handleClearBatch} />
          <StockBatchQueueTable selectedBatch={b.selectedBatch} totalBatchValuation={b.totalBatchValuation} onUpdateBatchItem={b.handleUpdateBatchItem} onRemoveBatchItem={b.handleRemoveBatchItem} />
          <StockCustomItemForm batchLength={n} onAddCustomItem={b.handleAddCustomItem} onError={b.setError} />
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-neutral-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={onClose} className="h-10 rounded-xl px-4 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 cursor-pointer">Cancel</button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => b.handleCommitBatch(true)} disabled={b.isSubmitting || n === 0}
              className="h-10 rounded-xl border border-neutral-200 bg-white px-4 text-xs font-semibold text-neutral-900 hover:bg-neutral-50 disabled:opacity-40 cursor-pointer">Save and add more</button>
            <button type="button" onClick={() => b.handleCommitBatch(false)} disabled={b.isSubmitting || n === 0}
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-40 cursor-pointer">
              {b.isSubmitting ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Saving…</>
                : n > 0 ? `Add ${n} item${n === 1 ? '' : 's'} · ${inr2(b.totalBatchValuation)}` : 'Choose items to add'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
