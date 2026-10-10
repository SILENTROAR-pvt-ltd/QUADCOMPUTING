'use client';

import React from 'react';
import { ChefHat, ReceiptText } from 'lucide-react';
import type { DashboardAnalyticsPayload } from './dashboard.types';

interface OperationsCardProps {
  status: DashboardAnalyticsPayload['order_status'];
  onOpenOrders: () => void;
  onOpenKitchen: () => void;
}

/** Orders in the period, how many are done and how many the kitchen still has, with the lists one tap away. */
export function OperationsCard({ status, onOpenOrders, onOpenKitchen }: OperationsCardProps) {
  const total = Number(status?.total) || 0;
  const done = Number(status?.completed) || 0;
  const kitchen = Number(status?.pending_kitchen) || 0;
  const other = Math.max(0, total - done - kitchen);
  const w = (n: number) => (total > 0 ? `${(n / total) * 100}%` : '0%');

  return (
    <section aria-label="Operations" className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="flex items-baseline justify-between">
        <h3 className="font-serif text-lg text-neutral-950">Operations</h3>
        <span className="font-mono text-xs text-neutral-500">{total} orders</span>
      </div>

      <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-neutral-100" aria-hidden="true">
        <div className="bg-emerald-600" style={{ width: w(done) }} />
        <div className="bg-amber-500" style={{ width: w(kitchen) }} />
        <div className="bg-neutral-300" style={{ width: w(other) }} />
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div><dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Completed</dt><dd className="font-serif text-2xl tabular-nums text-emerald-700">{done}</dd></div>
        <div><dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">In kitchen</dt><dd className="font-serif text-2xl tabular-nums text-amber-700">{kitchen}</dd></div>
        <div><dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Other</dt><dd className="font-serif text-2xl tabular-nums text-neutral-700">{other}</dd></div>
      </dl>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button type="button" onClick={onOpenOrders} className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 py-2.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 cursor-pointer">
          <ReceiptText className="h-3.5 w-3.5" /> Orders
        </button>
        <button type="button" onClick={onOpenKitchen} className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 py-2.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 cursor-pointer">
          <ChefHat className="h-3.5 w-3.5" /> Kitchen tickets
        </button>
      </div>
    </section>
  );
}

export default OperationsCard;
