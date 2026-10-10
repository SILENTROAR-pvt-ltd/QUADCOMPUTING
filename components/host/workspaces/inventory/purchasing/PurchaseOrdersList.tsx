'use client';

import { useState } from 'react';
import { MessageCircle, PackageCheck, XCircle } from 'lucide-react';
import { displayPhone } from '@/lib/services/inventory/purchase-message';
import { inr, istDateTime, qty } from '../inventory-format';
import type { PurchaseOrder } from './purchasing.types';

interface Props {
  orders: PurchaseOrder[];
  onReceive: (o: PurchaseOrder) => void;
  onResend: (o: PurchaseOrder) => void;
  onCancel: (o: PurchaseOrder) => Promise<void>;
}

const STATUS = {
  sent: { label: 'Awaiting delivery', chip: 'bg-sky-50 text-sky-800 ring-sky-200' },
  received: { label: 'Received', chip: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  cancelled: { label: 'Cancelled', chip: 'bg-neutral-100 text-neutral-600 ring-neutral-200' },
} as const;
const btn = 'inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold cursor-pointer';

/** Orders sent to vendors: open ones can be chased on WhatsApp, received into stock, or cancelled. */
export function PurchaseOrdersList({ orders, onReceive, onResend, onCancel }: Props) {
  const [show, setShow] = useState<'open' | 'all'>('open');
  const list = orders.filter((o) => show === 'all' || o.status === 'sent');
  const open = orders.filter((o) => o.status === 'sent').length;

  return (
    <section aria-label="Purchase orders" className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-xl text-neutral-950">Purchase orders</h3>
        <div className="inline-flex gap-1 rounded-xl bg-neutral-100 p-1">
          {([['open', `Open ${open}`], ['all', 'All']] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setShow(id)}
              className={`h-8 rounded-lg px-3 text-xs font-semibold cursor-pointer ${show === id ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500'}`}>{label}</button>
          ))}
        </div>
      </div>
      {list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">{show === 'open' ? 'No orders waiting for delivery.' : 'No purchase orders yet.'}</p>
      ) : list.map((o) => {
        const s = STATUS[o.status];
        return (
          <article key={o.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-neutral-950">{o.vendor_name} <span className="ml-1 font-mono text-[11px] font-normal text-neutral-500">{o.reference}</span></p>
                <p className="text-[11px] text-neutral-500">Sent {istDateTime(o.sent_at)}{o.vendor_phone ? ` · ${displayPhone(o.vendor_phone)}` : ''}{o.received_at ? ` · received ${istDateTime(o.received_at)}` : ''}</p>
              </div>
              <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${s.chip}`}>{s.label}</span>
            </div>
            <p className="mt-2 text-sm text-neutral-700">
              {o.lines.map((l) => `${l.name} ${qty(l.received_quantity ?? l.quantity, l.unit)}`).join(' · ')}
            </p>
            {o.note && <p className="mt-1 text-[11px] text-neutral-500">{o.note}</p>}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-neutral-500">About {inr(o.estimated_total)}</span>
              {o.status === 'sent' && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => { if (confirm(`Cancel order ${o.reference}?`)) void onCancel(o); }} className={`${btn} text-neutral-500 hover:bg-neutral-100`}><XCircle className="h-4 w-4" /> Cancel</button>
                  <button type="button" onClick={() => onResend(o)} className={`${btn} border border-neutral-200 text-neutral-800 hover:bg-neutral-50`}><MessageCircle className="h-4 w-4" /> Remind</button>
                  <button type="button" onClick={() => onReceive(o)} className={`${btn} bg-neutral-950 text-white hover:bg-neutral-800`}><PackageCheck className="h-4 w-4" /> Receive delivery</button>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
