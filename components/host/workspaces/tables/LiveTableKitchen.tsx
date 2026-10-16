'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BellRing, ChefHat } from 'lucide-react';
import type { KitchenTicket } from '@/lib/utils/kitchen';
import { kitchenSummary, ticketsForTable } from '@/lib/utils/table-kitchen';
import { DISH } from './kitchen-ui';
import { KitchenTicketBox } from './KitchenTicketBox';

interface LiveTableKitchenProps {
  /** Every ticket of the venue, kept live by the page. Only this table's are shown. */
  tickets: KitchenTicket[];
  tableNumber: string;
  /** The bill now open, so tickets served for an earlier party are left out. */
  orderId: string | null;
  loading: boolean;
  /** Marks a ticket served; resolves false when it could not be saved. */
  onServe: (ticketId: string) => Promise<boolean>;
}

/**
 * What the kitchen is doing for this table: each ticket, each dish and where it is, updated the moment the chef changes it.
 * A ready ticket carries the waiter's one action, "Mark served".
 */
export function LiveTableKitchen({ tickets, tableNumber, orderId, loading, onServe }: LiveTableKitchenProps) {
  const [now, setNow] = useState(() => Date.now());
  const [serving, setServing] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  // The minute counters move without a refetch.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const mine = useMemo(() => ticketsForTable(tickets, tableNumber, orderId), [tickets, tableNumber, orderId]);
  const summary = useMemo(() => kitchenSummary(mine), [mine]);

  const serve = async (id: string) => {
    if (serving) return;
    setServing(id);
    setFailed(null);
    const ok = await onServe(id);
    setServing(null);
    if (!ok) setFailed(id);
  };

  if (loading && mine.length === 0) {
    return (
      <div role="status" aria-label="Loading the kitchen" className="space-y-2.5">
        {[0, 1].map((i) => <div key={i} className="shimmer h-28 rounded-xl" style={{ animationDelay: `${i * 90}ms` }} />)}
      </div>
    );
  }
  if (mine.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 px-4 py-8 text-center text-xs text-neutral-500">
        <ChefHat className="mx-auto mb-2 h-5 w-5 text-neutral-400" aria-hidden />
        Nothing is with the kitchen for this table yet.
      </div>
    );
  }

  return (
    <section aria-label={`Kitchen for table ${tableNumber}`} className="space-y-3">
      {summary.readyDishes > 0 && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-[13px] font-semibold text-white">
          <BellRing className="h-4 w-4 shrink-0 animate-pulse" aria-hidden />
          {summary.readyDishes} {summary.readyDishes === 1 ? 'dish is' : 'dishes are'} ready to serve
        </p>
      )}
      <ul className="flex flex-wrap gap-1.5 text-[11px] font-semibold" aria-label="Dishes by state">
        {(['waiting', 'cooking', 'ready', 'served'] as const).filter((s) => summary[s] > 0).map((s) => (
          <li key={s} className={`rounded-full px-2.5 py-1 ${DISH[s].chip}`}>{DISH[s].label} · {summary[s]}</li>
        ))}
      </ul>
      <ul className="space-y-2.5">
        {mine.map((t) => <KitchenTicketBox key={t.id} ticket={t} now={now} serving={serving === t.id} failed={failed === t.id} onServe={(id) => void serve(id)} />)}
      </ul>
    </section>
  );
}

export default LiveTableKitchen;
