'use client';

import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, PackageCheck, PackageX } from 'lucide-react';
import type { DashboardAnalyticsPayload } from './dashboard.types';

interface StockAlertsCardProps {
  items: DashboardAnalyticsPayload['critical_items'];
  /** How many ingredients are tracked and how many are out. */
  stock?: { total: number; out: number };
  onOpenInventory?: () => void;
}

type Level = 'out' | 'critical' | 'low';
const LEVEL: Record<Level, { label: string; chip: string; bar: string; Icon: typeof AlertTriangle }> = {
  out: { label: 'Out', chip: 'bg-rose-600 text-white', bar: 'bg-rose-600', Icon: PackageX },
  critical: { label: 'Critical', chip: 'bg-rose-50 text-rose-800 ring-1 ring-rose-200', bar: 'bg-rose-500', Icon: AlertTriangle },
  low: { label: 'Low', chip: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200', bar: 'bg-amber-500', Icon: AlertTriangle },
};

/** Out at zero or below; critical at half the reorder level or less; low up to the reorder level. */
export function levelOf(stock: number, reorder: number): Level {
  if (stock <= 0) return 'out';
  return stock <= reorder / 2 ? 'critical' : 'low';
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, ''));

/** The ingredient control panel: what is out, what is critical, what is low, and how much to buy to reach reorder level. */
export function StockAlertsCard({ items, stock, onOpenInventory }: StockAlertsCardProps) {
  const [all, setAll] = useState(false);
  const list = (Array.isArray(items) ? items : [])
    .map((i) => ({ ...i, stock: Number(i.current_stock) || 0, reorder: Number(i.reorder_level) || 1 }))
    .map((i) => ({ ...i, level: levelOf(i.stock, i.reorder), ratio: i.stock / i.reorder }))
    .sort((a, b) => a.ratio - b.ratio);
  const counts = { out: list.filter((i) => i.level === 'out').length, critical: list.filter((i) => i.level === 'critical').length, low: list.filter((i) => i.level === 'low').length };
  const tracked = stock?.total ?? 0;
  const healthy = Math.max(0, tracked - list.length);
  const shown = all ? list : list.slice(0, 6);

  return (
    <section aria-label="Stock alerts" className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-lg text-neutral-950">Stock control</h3>
          <p className="text-[11px] text-neutral-500">Raw ingredients against their reorder level</p>
        </div>
        {onOpenInventory && (
          <button type="button" onClick={onOpenInventory} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-neutral-200 px-3 text-xs font-semibold text-neutral-800 hover:bg-neutral-50">
            Open Raw Inventory <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { k: 'Tracked', v: tracked, tone: 'text-neutral-950' },
          { k: 'Healthy', v: healthy, tone: 'text-emerald-700' },
          { k: 'Low / critical', v: counts.low + counts.critical, tone: 'text-amber-800' },
          { k: 'Out of stock', v: counts.out, tone: 'text-rose-700' },
        ].map((t) => (
          <div key={t.k} className="rounded-xl bg-neutral-50 px-3 py-2.5">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{t.k}</dt>
            <dd className={`mt-0.5 text-xl font-semibold tabular-nums ${t.tone}`}>{t.v}</dd>
          </div>
        ))}
      </dl>

      {list.length === 0 ? (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
          <PackageCheck className="h-4 w-4" aria-hidden /> Every ingredient is above its reorder level.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-neutral-100">
          {shown.map((i) => {
            const L = LEVEL[i.level];
            const need = Math.max(0, i.reorder - i.stock);
            return (
              <li key={i.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${L.chip}`}><L.Icon className="h-3 w-3" aria-hidden />{L.label}</span>
                    <span className="truncate text-sm font-medium capitalize text-neutral-900">{i.name}</span>
                  </span>
                  <span className="shrink-0 text-right text-xs tabular-nums text-neutral-700"><strong className="text-neutral-950">{fmt(i.stock)}</strong> / {fmt(i.reorder)} {i.unit || 'units'}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100" aria-hidden>
                  <div className={`h-full rounded-full ${L.bar}`} style={{ width: `${Math.max(3, Math.min(100, i.ratio * 100))}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-neutral-500">{need > 0 ? `Buy at least ${fmt(need)} ${i.unit || 'units'} to reach the reorder level` : 'At the reorder level: top up soon'}</p>
              </li>
            );
          })}
        </ul>
      )}
      {list.length > 6 && (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-2 cursor-pointer text-xs font-semibold text-neutral-700 hover:text-neutral-950">
          {all ? 'Show fewer' : `Show all ${list.length}`}
        </button>
      )}
    </section>
  );
}

export default StockAlertsCard;
