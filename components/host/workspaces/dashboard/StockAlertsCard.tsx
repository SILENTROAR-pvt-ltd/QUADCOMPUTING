'use client';

import React from 'react';
import type { DashboardAnalyticsPayload } from './dashboard.types';

interface StockAlertsCardProps {
  items: DashboardAnalyticsPayload['critical_items'];
}

/** Raw ingredients at or below their reorder level, lowest stock first. */
export function StockAlertsCard({ items }: StockAlertsCardProps) {
  const list = (Array.isArray(items) ? items : []).slice().sort((a, b) => (a.current_stock / (a.reorder_level || 1)) - (b.current_stock / (b.reorder_level || 1)));
  return (
    <section aria-label="Stock alerts" className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg text-neutral-950">Stock alerts</h3>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${list.length ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {list.length ? `${list.length} low` : 'All healthy'}
        </span>
      </div>
      <ul className="mt-4 max-h-56 divide-y divide-neutral-100 overflow-y-auto">
        {list.map((item) => {
          const level = Math.min(100, Math.round((Number(item.current_stock) / (Number(item.reorder_level) || 1)) * 100));
          return (
            <li key={item.id} className="py-2.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-medium capitalize text-neutral-900">{item.name}</span>
                <span className="shrink-0 font-mono text-xs text-rose-700">{item.current_stock} {item.unit || 'units'}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                <div className="h-full rounded-full bg-rose-500" style={{ width: `${Math.max(level, 3)}%` }} />
              </div>
              <p className="mt-1 text-[10px] text-neutral-400">Reorder at {item.reorder_level} {item.unit || 'units'}</p>
            </li>
          );
        })}
      </ul>
      {list.length === 0 && <p className="mt-4 text-sm text-neutral-400">Every ingredient is above its reorder level.</p>}
      {list.length > 0 && <p className="mt-3 text-[11px] text-neutral-500">Restock from Raw Inventory.</p>}
    </section>
  );
}

export default StockAlertsCard;
