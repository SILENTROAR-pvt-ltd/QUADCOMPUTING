'use client';

import React from 'react';
import type { DeliveryStatus } from '@/lib/services/delivery/delivery-rules';
import { DeliveryOrderCard } from './DeliveryOrderCard';
import { useDeliveryBoard, type DeliveryOrder } from './useDeliveryBoard';

const ACTIVE = ['received', 'preparing', 'out_for_delivery'];

/** Delivery orders from the last day: what is still to go out, then what has been delivered. Settle each one in Billing. */
export function DeliveryWorkspace() {
  const { orders, loading, error, busyId, advance, markPaid } = useDeliveryBoard();
  const active = orders.filter((o) => ACTIVE.includes(o.delivery_status ?? 'received'));
  const done = orders.filter((o) => o.delivery_status === 'delivered');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl tracking-tight text-neutral-950">Delivery</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Each order goes to the kitchen with its address. Move it on as it leaves the kitchen, and settle it in Billing when paid.
        </p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

      {loading && orders.length === 0 ? (
        <div className="h-48 animate-pulse rounded-2xl bg-neutral-100" aria-busy="true" />
      ) : orders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
          No delivery orders yet. Turn delivery on in My profile, under Hours & services.
        </p>
      ) : (
        <>
          <Column title={`On the way (${active.length})`} orders={active} busyId={busyId} onAdvance={advance} onMarkPaid={markPaid} empty="Nothing waiting. New delivery orders appear here." />
          {done.length > 0 && <Column title={`Delivered (${done.length})`} orders={done} busyId={busyId} onAdvance={advance} onMarkPaid={markPaid} />}
        </>
      )}
    </div>
  );
}

function Column({ title, orders, busyId, onAdvance, onMarkPaid, empty }: {
  title: string; orders: DeliveryOrder[]; busyId: string | null; empty?: string;
  onAdvance: (id: string, status: DeliveryStatus) => void; onMarkPaid: (id: string) => void;
}) {
  return (
    <section aria-label={title} className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">{title}</h2>
      {orders.length === 0 && empty ? <p className="text-sm text-neutral-500">{empty}</p> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {orders.map((o) => (
            <DeliveryOrderCard key={o.id} order={o} busy={busyId === o.id} onAdvance={onAdvance} onMarkPaid={onMarkPaid} />
          ))}
        </div>
      )}
    </section>
  );
}
