'use client';

import React from 'react';
import { DELIVERY_STATUS_LABEL, type DeliveryStatus } from '@/lib/services/delivery/delivery-rules';
import type { DeliveryOrder } from './useDeliveryBoard';

const NEXT: Partial<Record<DeliveryStatus, { to: DeliveryStatus; label: string }>> = {
  received: { to: 'preparing', label: 'Start preparing' },
  preparing: { to: 'out_for_delivery', label: 'Out for delivery' },
  out_for_delivery: { to: 'delivered', label: 'Mark delivered' },
};

const rupees = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function paymentLine(o: DeliveryOrder): string {
  if (o.delivery_payment === 'upi_advance') return o.delivery_paid ? 'UPI paid in advance' : 'UPI advance, not confirmed yet';
  return 'Cash on delivery, collect and settle in Billing';
}

interface Props {
  order: DeliveryOrder;
  busy: boolean;
  onAdvance: (id: string, status: DeliveryStatus) => void;
  onMarkPaid: (id: string) => void;
}

/** One delivery: where it goes, what it holds, how it is paid, and the one button for the next stage. */
export function DeliveryOrderCard({ order: o, busy, onAdvance, onMarkPaid }: Props) {
  const stage = o.delivery_status ?? 'received';
  const next = NEXT[stage];
  const items = (o.items ?? []).map((i) => `${i.quantity ?? i.qty ?? 1} × ${i.name ?? i.item_name ?? 'Dish'}`).join(', ');
  const phoneDigits = (o.delivery_phone ?? '').replace(/[^\d+]/g, '');
  const needsUpiConfirm = o.delivery_payment === 'upi_advance' && !o.delivery_paid;

  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-xs font-semibold text-neutral-500">{o.table_number}</span>
        <span className="rounded-full bg-neutral-950 px-2.5 py-0.5 text-xs font-semibold text-white">{DELIVERY_STATUS_LABEL[stage]}</span>
      </header>

      <p className="mt-2 text-sm font-semibold text-neutral-950">{o.customer_name || 'Guest'}
        <span className="ml-2 text-xs font-normal text-neutral-500">{new Date(o.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
      </p>
      <p className="mt-1 text-sm text-neutral-800">{o.delivery_address}</p>
      {phoneDigits && <a href={`tel:${phoneDigits}`} className="mt-1 inline-block text-sm font-semibold text-neutral-950 underline underline-offset-2">{o.delivery_phone}</a>}
      <p className="mt-2 text-xs text-neutral-500">
        {o.delivery_distance_km != null ? `${o.delivery_distance_km} km · ` : ''}Fee {rupees(o.delivery_fee)}
      </p>
      {items && <p className="mt-2 text-sm text-neutral-700">{items}</p>}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3">
        <div>
          <p className="text-base font-bold text-neutral-950">{rupees(o.grand_total)}</p>
          <p className={`text-xs ${needsUpiConfirm ? 'font-semibold text-amber-700' : 'text-neutral-500'}`}>{paymentLine(o)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {needsUpiConfirm && (
            <button type="button" onClick={() => onMarkPaid(o.id)} disabled={busy}
              className="h-10 cursor-pointer rounded-xl border border-neutral-300 px-3 text-sm font-semibold text-neutral-900 hover:bg-neutral-100 disabled:opacity-40">
              Confirm UPI received
            </button>
          )}
          {next && (
            <button type="button" onClick={() => onAdvance(o.id, next.to)} disabled={busy}
              className="h-10 cursor-pointer rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-40">
              {busy ? 'Updating…' : next.label}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
