'use client';

import React, { useEffect, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { orderMessage, whatsappLink, type ShareableOrder } from '@/lib/services/vendors/vendor-input';
import type { Vendor } from './useVendors';

interface Props {
  vendor: Vendor;
  loadOrders: () => Promise<{ orders: ShareableOrder[]; venueName: string }>;
  onClose: () => void;
}

const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
const itemCount = (o: ShareableOrder) => (o.items ?? []).reduce((n, i) => n + (Number(i.quantity ?? i.qty ?? 1) || 1), 0);

/** Pick a guest order, check the message, and send it to the vendor on WhatsApp. The vendor bills it on their side. */
export function ShareOrderSheet({ vendor, loadOrders, onClose }: Props) {
  const [orders, setOrders] = useState<ShareableOrder[] | null>(null);
  const [venueName, setVenueName] = useState('our venue');
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOrders().then((r) => { setOrders(r.orders); setVenueName(r.venueName); }).catch((e) => setError(e.message));
  }, [loadOrders]);

  const pick = (o: ShareableOrder) => { setSelected(o.id); setMessage(orderMessage(o, venueName)); };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="share-title" className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 id="share-title" className="font-serif text-2xl text-neutral-950">Share an order</h2>
            <p className="mt-0.5 text-xs text-neutral-500">To {vendor.name} on WhatsApp. They add it to their own bill.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 cursor-pointer place-items-center rounded-full hover:bg-neutral-100"><X className="h-4 w-4" /></button>
        </header>

        <div className="mt-4 flex-1 space-y-4 overflow-y-auto pb-1">
          <div>
            <p className="mb-2 text-xs font-semibold text-neutral-700">Guest orders, last 2 days</p>
            {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
            {!orders && !error && <div className="h-24 animate-pulse rounded-xl bg-neutral-100" aria-busy="true" />}
            {orders && orders.length === 0 && <p className="text-xs text-neutral-500">No guest orders in the last 2 days. You can still write a message below.</p>}
            {orders && orders.length > 0 && (
              <ul className="max-h-56 space-y-1.5 overflow-y-auto">
                {orders.map((o) => (
                  <li key={o.id}>
                    <button type="button" onClick={() => pick(o)} aria-pressed={selected === o.id}
                      className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-xs ${selected === o.id ? 'border-neutral-950 bg-neutral-50' : 'border-neutral-200 hover:bg-neutral-50'}`}>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-neutral-900">{o.delivery_address ? 'Delivery' : o.table_number || 'Counter'}{o.customer_name && !/^guest$/i.test(o.customer_name) ? ` · ${o.customer_name}` : ''}</span>
                        <span className="block text-neutral-500">{when(o.created_at)} · {itemCount(o)} {itemCount(o) === 1 ? 'item' : 'items'}</span>
                      </span>
                      <span className="shrink-0 text-[11px] font-semibold text-neutral-600">{selected === o.id ? 'Selected' : 'Choose'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label htmlFor="share-msg" className="mb-1 block text-xs font-semibold text-neutral-700">Message</label>
            <textarea id="share-msg" rows={8} value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="Choose an order above, or write the order here."
              className="w-full resize-none rounded-xl border border-neutral-200 p-3 font-mono text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none" />
          </div>
        </div>

        <a href={message.trim() ? whatsappLink(vendor.whatsapp_phone, message.trim()) : undefined} target="_blank" rel="noopener noreferrer"
          aria-disabled={!message.trim()} onClick={(e) => { if (!message.trim()) e.preventDefault(); }}
          className={`mt-4 inline-flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white ${message.trim() ? 'bg-[#128c4a] hover:bg-[#0f7a40]' : 'cursor-not-allowed bg-neutral-300'}`}>
          <MessageCircle className="h-4 w-4" aria-hidden /> Send on WhatsApp
        </a>
      </div>
    </div>
  );
}
