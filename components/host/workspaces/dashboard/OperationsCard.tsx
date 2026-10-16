'use client';

import React from 'react';
import { ChefHat, ReceiptText } from 'lucide-react';
import type { DashboardAnalyticsPayload } from './dashboard.types';

interface OperationsCardProps {
  status: DashboardAnalyticsPayload['order_status'];
  onOpenOrders: () => void;
  onOpenKitchen: () => void;
}

const PARTS = [
  { key: 'done', label: 'Completed', hint: 'served or settled', bar: 'bg-emerald-600', dot: 'bg-emerald-600' },
  { key: 'kitchen', label: 'In kitchen', hint: 'pending, preparing or ready', bar: 'bg-amber-500', dot: 'bg-amber-500' },
  { key: 'open', label: 'Open', hint: 'not yet in the kitchen or settled', bar: 'bg-neutral-300', dot: 'bg-neutral-400' },
] as const;

/** Orders in the period (cancelled left out): how many are done, how many the kitchen still has, and what is open. */
export function OperationsCard({ status, onOpenOrders, onOpenKitchen }: OperationsCardProps) {
  const total = Number(status?.total) || 0;
  const done = Number(status?.completed) || 0;
  const kitchen = Number(status?.pending_kitchen) || 0;
  const values = { done, kitchen, open: Math.max(0, total - done - kitchen) };
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <section aria-label="Operations" className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-serif text-lg text-neutral-950">Operations</h3>
        <span className="text-[11px] text-neutral-500">{total} {total === 1 ? 'order' : 'orders'} · {pct(done)}% completed</span>
      </div>

      <div className="mt-4 flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-neutral-100" aria-hidden="true">
        {PARTS.map((p) => values[p.key] > 0 && <div key={p.key} className={p.bar} style={{ width: `${(values[p.key] / Math.max(total, 1)) * 100}%` }} />)}
      </div>

      <dl className="mt-4 space-y-2">
        {PARTS.map((p) => (
          <div key={p.key} className="flex items-center justify-between gap-3 text-sm">
            <dt className="flex min-w-0 items-center gap-2 text-neutral-700">
              <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${p.dot}`} />
              <span className="truncate">{p.label} <span className="text-[11px] text-neutral-400">· {p.hint}</span></span>
            </dt>
            <dd className="shrink-0 tabular-nums"><span className="font-semibold text-neutral-950">{values[p.key]}</span>
              <span className="ml-1.5 text-[11px] text-neutral-500">{pct(values[p.key])}%</span></dd>
          </div>
        ))}
      </dl>

      <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
        <button type="button" onClick={onOpenOrders} className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 cursor-pointer">
          <ReceiptText className="h-3.5 w-3.5" /> Orders
        </button>
        <button type="button" onClick={onOpenKitchen} className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 cursor-pointer">
          <ChefHat className="h-3.5 w-3.5" /> Kitchen tickets
        </button>
      </div>
    </section>
  );
}

export default OperationsCard;
