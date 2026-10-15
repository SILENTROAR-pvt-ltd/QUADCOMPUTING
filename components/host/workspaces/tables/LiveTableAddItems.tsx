'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Minus, Plus, Search } from 'lucide-react';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';

interface CatalogItem { id: string; name: string; price: number; category: string; item_type?: string; is_available?: boolean }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const inr = (n: number) => `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

interface LiveTableAddItemsProps {
  venueId: string;
  tableNumber: string;
  onAdded: () => void;
}

/** Pick dishes from the menu catalogue and send them to this table, as the guest app does. */
export function LiveTableAddItems({ venueId, tableNumber, onAdded }: LiveTableAddItemsProps) {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<{ items: CatalogItem[] }>(`/api/host/catalog?business_id=${encodeURIComponent(venueId)}`, { cache: 'no-store' }).then((r) => {
      // Only real catalogue items can be ordered: room add-ons are not, and stays are not table orders.
      const usable = (r.data?.items ?? []).filter((i) => UUID.test(i.id) && i.is_available !== false && i.item_type !== 'room');
      setCatalog(usable);
      if (!r.ok) setError(r.error);
      setLoading(false);
    });
  }, [venueId]);

  const categories = useMemo(() => ['All', ...Array.from(new Set(catalog.map((i) => i.category).filter(Boolean)))], [catalog]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((i) => (category === 'All' || i.category === category) && (!q || i.name.toLowerCase().includes(q)));
  }, [catalog, category, query]);

  const lines = Object.entries(cart).map(([id, qty]) => ({ item: catalog.find((c) => c.id === id)!, qty })).filter((l) => l.item && l.qty > 0);
  const total = lines.reduce((sum, l) => sum + l.item.price * l.qty, 0);
  const setQty = (id: string, qty: number) => setCart((c) => ({ ...c, [id]: Math.max(0, Math.min(50, qty)) }));

  const send = async () => {
    if (sending || lines.length === 0) return;
    setSending(true);
    setError(null);
    setDone(null);
    const result = await apiRequest<{ ticket_number: string; is_addon: boolean }>('/api/host/tables/items', jsonRequest('POST', {
      table_number: tableNumber,
      items: lines.map((l) => ({ item_id: l.item.id, quantity: l.qty })),
    }));
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCart({});
    setDone(`${result.data?.is_addon ? 'Added to the open order' : 'Sent to the kitchen'} · ${result.data?.ticket_number ?? ''}`.trim());
    onAdded();
  };

  return (
    <section aria-label="Add items to this table" className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the menu"
          aria-label="Search the menu"
          maxLength={60}
          className="h-11 w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-3 text-[16px] sm:text-sm focus:border-neutral-900 focus:outline-none"
        />
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Category">
        {categories.map((c) => (
          <button key={c} type="button" onClick={() => setCategory(c)} aria-pressed={category === c}
            className={`h-9 shrink-0 rounded-full border px-3.5 text-[12px] font-semibold cursor-pointer ${category === c ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-200 bg-white text-neutral-700'}`}>
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-xs text-neutral-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading the menu…</p>
      ) : visible.length === 0 ? (
        <p className="text-xs text-neutral-500">No menu items match.</p>
      ) : (
        <ul className="max-h-[48dvh] divide-y divide-neutral-100 overflow-y-auto rounded-xl border border-neutral-200 bg-white">
          {visible.map((item) => {
            const qty = cart[item.id] ?? 0;
            return (
              <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-950">{item.name}</p>
                  <p className="text-[11px] text-neutral-500">{item.category} · {inr(item.price)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {qty > 0 && (
                    <button type="button" onClick={() => setQty(item.id, qty - 1)} aria-label={`Remove one ${item.name}`} className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 cursor-pointer active:bg-neutral-100"><Minus className="h-3.5 w-3.5" /></button>
                  )}
                  {qty > 0 && <span className="w-6 text-center font-mono text-sm font-bold">{qty}</span>}
                  <button type="button" onClick={() => setQty(item.id, qty + 1)} aria-label={`Add one ${item.name}`} className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-950 text-white cursor-pointer active:bg-neutral-800"><Plus className="h-3.5 w-3.5" /></button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {error && <p role="alert" className="text-xs font-medium text-rose-600">{error}</p>}
      {done && <p role="status" className="flex items-center gap-1.5 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> {done}</p>}

      <button
        type="button"
        onClick={send}
        disabled={sending || lines.length === 0}
        className="sticky bottom-0 flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-neutral-950 text-[14px] font-semibold text-white shadow-[0_14px_24px_-14px_rgba(0,0,0,0.6)] active:scale-[0.99] disabled:bg-neutral-300 disabled:shadow-none"
      >
        {sending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {lines.length === 0 ? 'Pick items to add' : `Add ${lines.reduce((n, l) => n + l.qty, 0)} to table · ${inr(total)}`}
      </button>
    </section>
  );
}

export default LiveTableAddItems;
