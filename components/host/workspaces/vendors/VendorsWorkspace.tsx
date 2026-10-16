'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { VENDOR_CATEGORIES, type VendorCategory } from '@/lib/services/vendors/vendor-input';
import { VendorCard } from './VendorCard';
import { VendorFormSheet } from './VendorFormSheet';
import { ShareOrderSheet } from './ShareOrderSheet';
import { useVendors, type Vendor } from './useVendors';

/**
 * Vendors: the host's neighbour and partner contacts with their QR and WhatsApp number. When a guest order comes in,
 * the host shares it to the vendor on WhatsApp in one tap; the vendor adds it to their own bill.
 */
export function VendorsWorkspace() {
  const v = useVendors();
  const [filter, setFilter] = useState<VendorCategory | 'all'>('all');
  const [editing, setEditing] = useState<Vendor | null | undefined>(undefined);
  const [sharing, setSharing] = useState<Vendor | null>(null);
  const shown = filter === 'all' ? v.vendors : v.vendors.filter((x) => x.category === filter);
  const used = VENDOR_CATEGORIES.filter((c) => v.vendors.some((x) => x.category === c.id));

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-neutral-950">Vendors</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-500">Neighbour and partner contacts: a food partner, bike rental, taxi, laundry. Share a guest order with them on WhatsApp in one tap.</p>
        </div>
        <button type="button" onClick={() => setEditing(null)}
          className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white hover:bg-neutral-800">
          <Plus className="h-4 w-4" aria-hidden /> Add vendor
        </button>
      </header>

      {used.length > 1 && (
        <div role="radiogroup" aria-label="Category" className="flex flex-wrap gap-1.5">
          {[{ id: 'all' as const, label: 'All' }, ...used].map((c) => (
            <button key={c.id} type="button" role="radio" aria-checked={filter === c.id} onClick={() => setFilter(c.id)}
              className={`h-8 cursor-pointer rounded-full px-3 text-xs font-semibold ${filter === c.id ? 'bg-neutral-950 text-white' : 'border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'}`}>
              {c.label}
            </button>
          ))}
        </div>
      )}

      {v.error && (
        <p role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {v.error}<button type="button" onClick={() => void v.retry()} className="cursor-pointer font-semibold underline underline-offset-2">Try again</button>
        </p>
      )}

      {v.loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-neutral-100" />)}</div>
      ) : v.vendors.length === 0 && !v.error ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 p-10 text-center">
          <p className="text-sm font-semibold text-neutral-900">No vendors yet</p>
          <p className="mt-1 text-xs text-neutral-500">Add a partner with their QR and WhatsApp number to share guest orders with them.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((x) => (
            <VendorCard key={x.id} vendor={x} onEdit={() => setEditing(x)} onShare={() => setSharing(x)} onRemove={() => v.remove(x.id)} />
          ))}
        </div>
      )}

      {editing !== undefined && <VendorFormSheet vendor={editing} onClose={() => setEditing(undefined)} onSave={v.save} />}
      {sharing && <ShareOrderSheet vendor={sharing} loadOrders={v.loadOrders} onClose={() => setSharing(null)} />}
    </div>
  );
}
