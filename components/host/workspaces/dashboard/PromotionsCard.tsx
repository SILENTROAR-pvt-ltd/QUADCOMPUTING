'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { DashboardAnalyticsPayload } from './dashboard.types';

interface PromotionsCardProps {
  promotions: DashboardAnalyticsPayload['active_promotions'];
  formatCurrency: (n: number) => string;
  onAdd: () => void;
  onDelete: (id: string) => Promise<void>;
  deletingId: string | null;
}

/** The venue's active promotions, with adding and removing them. */
export function PromotionsCard({ promotions, formatCurrency, onAdd, onDelete, deletingId }: PromotionsCardProps) {
  const list = Array.isArray(promotions) ? promotions : [];
  return (
    <section aria-label="Active promotions" className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg text-neutral-950">Promotions</h3>
        <button type="button" onClick={onAdd} className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-800 hover:bg-neutral-50 cursor-pointer">
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>
      <ul className="mt-4 divide-y divide-neutral-100">
        {list.map((promo) => (
          <li key={promo.id} className="flex items-center justify-between gap-3 py-2.5">
            <span className="truncate text-sm font-medium text-neutral-900">{promo.name}</span>
            <span className="flex shrink-0 items-center gap-3">
              <span className="font-mono text-xs font-semibold text-neutral-700">
                −{promo.discount_type === 'PERCENTAGE' ? `${promo.value}%` : formatCurrency(promo.value)}
              </span>
              <button type="button" onClick={() => void onDelete(promo.id)} disabled={deletingId === promo.id} aria-label={`Delete ${promo.name}`} className="text-neutral-400 hover:text-rose-600 disabled:opacity-40 cursor-pointer">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </span>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p className="mt-4 text-sm text-neutral-400">No active promotions.</p>}
    </section>
  );
}

export default PromotionsCard;
