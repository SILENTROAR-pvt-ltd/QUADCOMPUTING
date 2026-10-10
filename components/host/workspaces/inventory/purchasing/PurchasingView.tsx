'use client';

import { useState } from 'react';
import type { StockItemView } from '@/lib/services/inventory/inventory.types';
import { PurchaseListBuilder } from './PurchaseListBuilder';
import { PurchaseOrdersList } from './PurchaseOrdersList';
import { ReceiveOrderSheet } from './ReceiveOrderSheet';
import { usePurchasing } from './usePurchasing';
import type { PurchaseOrder } from './purchasing.types';

interface Props { items: StockItemView[]; version: number; onChanged: (msg: string) => void }

/** Purchasing: build an order from low stock, send it on WhatsApp, then receive it into stock. */
export function PurchasingView({ items, version, onChanged }: Props) {
  const p = usePurchasing(version);
  const [receiving, setReceiving] = useState<PurchaseOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!p.loaded) return <div className="h-80 animate-pulse rounded-2xl border border-neutral-200 bg-neutral-100/70" aria-busy="true" />;
  if (p.error && p.vendors.length === 0 && p.orders.length === 0) {
    return <p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">{p.error}</p>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <PurchaseListBuilder items={items} p={p} onSent={onChanged} />
      <div className="space-y-3">
        {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</p>}
        <PurchaseOrdersList
          orders={p.orders}
          onResend={p.resend}
          onReceive={setReceiving}
          onCancel={async (o) => {
            setError(null);
            try { await p.cancel(o.id); onChanged(`${o.reference} cancelled.`); } catch (e: any) { setError(e.message); }
          }}
        />
      </div>
      {receiving && <ReceiveOrderSheet order={receiving} onClose={() => setReceiving(null)} onReceive={p.receive} onDone={onChanged} />}
    </div>
  );
}
