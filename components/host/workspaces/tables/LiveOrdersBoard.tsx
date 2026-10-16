'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChefHat } from 'lucide-react';
import type { KitchenTicket } from '@/lib/utils/kitchen';
import { activeTickets } from '@/lib/utils/table-kitchen';
import { OrderCard } from './OrderCard';

type Filter = 'all' | 'ready' | 'cooking';

interface LiveOrdersBoardProps {
  /** Every ticket of the venue, kept live by the page. */
  tickets: KitchenTicket[];
  loading: boolean;
  /** Marks a ticket served; resolves false when it could not be saved. */
  onServe: (ticketId: string) => Promise<boolean>;
}

/** Every order still to be served, as boxes: what each table ordered, what is ready, and one "Served" button. */
export function LiveOrdersBoard({ tickets, loading, onServe }: LiveOrdersBoardProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const [now, setNow] = useState(() => Date.now());
  const [serving, setServing] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  // The minute counters move without a refetch.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const open = useMemo(() => activeTickets(tickets), [tickets]);
  const readyCount = open.filter((t) => t.status === 'READY').length;
  const shown = open.filter((t) => filter === 'all' || (filter === 'ready' ? t.status === 'READY' : t.status !== 'READY'));

  const serve = React.useCallback(async (id: string) => {
    setServing(id);
    setFailed(null);
    const ok = await onServe(id);
    setServing(null);
    if (!ok) setFailed(id);
  }, [onServe]);

  const chips: { id: Filter; label: string; n: number }[] = [
    { id: 'all', label: 'All', n: open.length },
    { id: 'ready', label: 'Ready', n: readyCount },
    { id: 'cooking', label: 'Cooking', n: open.length - readyCount },
  ];

  return (
    <section aria-label="Orders to serve" className="space-y-3">
      <ul className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Filter orders">
        {chips.map((c) => (
          <li key={c.id} className="shrink-0">
            <button type="button" aria-pressed={filter === c.id} onClick={() => setFilter(c.id)}
              className={`inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[12px] font-semibold ${filter === c.id ? 'border-neutral-950 bg-neutral-950 text-white' : c.id === 'ready' && c.n > 0 ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-neutral-200 bg-white text-neutral-700'}`}>
              {c.label} <span className="font-mono">{c.n}</span>
            </button>
          </li>
        ))}
      </ul>

      {loading && open.length === 0 ? (
        <div role="status" aria-label="Loading orders" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="shimmer h-44 rounded-2xl" style={{ animationDelay: `${i * 90}ms` }} />)}
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-12 text-center text-sm text-neutral-500">
          <ChefHat className="mx-auto mb-2 h-6 w-6 text-neutral-400" aria-hidden />
          {filter === 'ready' ? 'Nothing is ready to serve right now.' : 'No orders waiting. New orders appear here the moment they are placed.'}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((t) => <OrderCard key={t.id} ticket={t} now={now} serving={serving === t.id} failed={failed === t.id} onServe={serve} />)}
        </ul>
      )}
    </section>
  );
}

export default LiveOrdersBoard;
