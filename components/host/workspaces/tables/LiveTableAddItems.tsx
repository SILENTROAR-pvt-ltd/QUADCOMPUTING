'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Search } from 'lucide-react';
import { press } from '@/components/guest/menu/motion';
import { AnimatedCount } from '@/components/guest/menu/AnimatedCount';
import { useMenuCatalog } from './useMenuCatalog';
import { AddItemRow, inr } from './AddItemRow';
import type { PickedItem } from './useTableBill';

interface LiveTableAddItemsProps {
  venueId: string;
  /** Puts the picks on the bill at once and sends them behind; resolves with what to tell the waiter. */
  onSubmit: (picks: PickedItem[]) => Promise<{ ok: boolean; message: string }>;
}

const SKELETON_ROWS = 7;

/**
 * Pick dishes from the menu and send them to this table. Three fixed bands: search and categories on top, the dishes
 * scrolling in the middle, the send button at the bottom. Sending is instant: the picker clears and the dishes are on the
 * bill straight away, so the waiter can keep picking while the kitchen is told.
 */
export function LiveTableAddItems({ venueId, onSubmit }: LiveTableAddItemsProps) {
  const { items, loading, error: loadError } = useMenuCatalog(venueId);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [sending, setSending] = useState(0);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const categories = useMemo(() => ['All', ...Array.from(new Set(items.map((i) => i.category).filter(Boolean)))], [items]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => (category === 'All' || i.category === category) && (!q || i.name.toLowerCase().includes(q)));
  }, [items, category, query]);

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const picks: PickedItem[] = useMemo(
    () => Object.entries(cart).flatMap(([id, quantity]) => { const i = byId.get(id); return i && quantity > 0 ? [{ id, name: i.name, price: i.price, quantity }] : []; }),
    [cart, byId],
  );
  const count = picks.reduce((n, p) => n + p.quantity, 0);
  const total = picks.reduce((s, p) => s + p.price * p.quantity, 0);
  const setQty = useCallback((id: string, qty: number) => setCart((c) => ({ ...c, [id]: Math.max(0, Math.min(50, qty)) })), []);

  const send = () => {
    if (count === 0) return;
    const batch = picks;
    setCart({});
    setSending((n) => n + 1);
    setNote(null);
    void onSubmit(batch).then((r) => {
      setSending((n) => n - 1);
      setNote({ ok: r.ok, text: r.message });
      // A refused batch goes back into the picker, so nothing the waiter chose is lost.
      if (!r.ok) setCart((c) => { const next = { ...c }; batch.forEach((p) => { next[p.id] = (next[p.id] ?? 0) + p.quantity; }); return next; });
    });
  };

  return (
    <section aria-label="Add items to this table" className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-2 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the menu" aria-label="Search the menu" maxLength={60}
            className="h-11 w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-3 text-[16px] focus:border-neutral-900 focus:outline-none" />
        </div>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Category">
          {categories.map((c) => (
            <motion.button key={c} type="button" onClick={() => setCategory(c)} aria-pressed={category === c} {...press}
              className={`h-9 shrink-0 cursor-pointer rounded-full border px-3.5 text-[12px] font-semibold transition-colors ${category === c ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-200 bg-white text-neutral-700'}`}>
              {c}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-xl border border-neutral-200 bg-white">
        {loading ? (
          <div role="status" aria-label="Loading the menu" className="space-y-px">
            {Array.from({ length: SKELETON_ROWS }, (_, i) => <div key={i} className="shimmer h-[3.25rem]" style={{ animationDelay: `${i * 80}ms` }} />)}
          </div>
        ) : visible.length === 0 ? (
          <p className="p-3 text-xs text-neutral-500">{loadError ?? 'No menu items match.'}</p>
        ) : (
          <ul className="divide-y divide-neutral-100">{visible.map((item) => <AddItemRow key={item.id} item={item} qty={cart[item.id] ?? 0} onQty={setQty} />)}</ul>
        )}
      </div>

      <div className="shrink-0 space-y-1.5 pt-2">
        {note && (
          <p role={note.ok ? 'status' : 'alert'} className={`flex items-center gap-1.5 text-xs font-medium ${note.ok ? 'text-emerald-700' : 'text-rose-600'}`}>
            {note.ok && <CheckCircle2 className="h-3.5 w-3.5" />} {note.text}
          </p>
        )}
        <motion.button type="button" onClick={send} disabled={count === 0} {...press}
          className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-neutral-950 text-[14px] font-semibold text-white disabled:bg-neutral-300">
          {count === 0
            ? (sending > 0 ? 'Sending to the kitchen…' : 'Pick items to add')
            : <>Add <AnimatedCount value={count} /> to table · <AnimatedCount value={inr(total)} /></>}
        </motion.button>
      </div>
    </section>
  );
}

export default LiveTableAddItems;
