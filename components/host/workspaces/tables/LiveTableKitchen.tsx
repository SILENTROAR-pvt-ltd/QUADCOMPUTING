'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BellRing, CheckCircle2, ChefHat, Loader2 } from 'lucide-react';
import type { KitchenTicket } from '@/lib/utils/kitchen';
import { dishState, kitchenSummary, ticketsForTable, type DishState } from '@/lib/utils/table-kitchen';

const DISH: Record<DishState, { label: string; chip: string }> = {
  waiting: { label: 'Waiting', chip: 'bg-neutral-100 text-neutral-700' },
  cooking: { label: 'Cooking', chip: 'bg-sky-100 text-sky-900' },
  ready: { label: 'Ready to serve', chip: 'bg-emerald-100 text-emerald-900' },
  served: { label: 'Served', chip: 'bg-neutral-200 text-neutral-600' },
};

const minutesSince = (iso: string | undefined, now: number) => {
  const t = Date.parse(iso || '');
  return Number.isFinite(t) ? Math.max(0, Math.round((now - t) / 60000)) : null;
};

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
    return <p className="flex items-center gap-2 text-xs text-neutral-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading the kitchen…</p>;
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
        {mine.map((ticket) => {
          const ready = ticket.status === 'READY';
          const served = ticket.status === 'SERVED';
          const mins = minutesSince(ready ? ticket.updated_at || ticket.created_at : ticket.created_at, now);
          const headState: DishState = served ? 'served' : ready ? 'ready' : ticket.status === 'PREPARING' ? 'cooking' : 'waiting';
          return (
            <li key={ticket.id} className={`overflow-hidden rounded-xl border bg-white ${ready ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-neutral-200'}`}>
              <div className="flex items-center justify-between gap-2 border-b border-neutral-100 px-3 py-2">
                <p className="flex min-w-0 items-center gap-2 text-xs">
                  <span className="font-mono font-bold text-neutral-950">{ticket.ticket_number}</span>
                  {ticket.station && <span className="truncate text-neutral-500">{ticket.station}</span>}
                </p>
                <p className="flex shrink-0 items-center gap-1.5 text-[11px]">
                  {mins !== null && !served && <span className="font-mono text-neutral-500">{ready ? `ready ${mins}m` : `${mins}m`}</span>}
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${DISH[headState].chip}`}>{DISH[headState].label}</span>
                </p>
              </div>

              <ul className="divide-y divide-neutral-100">
                {(ticket.items || []).map((item, idx) => {
                  const state = dishState(ticket, item);
                  return (
                    <li key={`${ticket.id}-${idx}`} className="flex items-center justify-between gap-3 px-3 py-2">
                      <p className="min-w-0 text-sm font-medium text-neutral-950">
                        <span className="mr-1.5 font-mono font-bold">{Math.max(1, Number(item.qty) || 1)}×</span>
                        <span className="break-words">{item.name}</span>
                        {item.notes && <span className="mt-0.5 block text-[11px] font-normal text-amber-800">{item.notes}</span>}
                      </p>
                      <span className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${DISH[state].chip}`}>
                        {state === 'served' || state === 'ready' ? <CheckCircle2 className="h-3 w-3" aria-hidden /> : <ChefHat className="h-3 w-3" aria-hidden />}
                        {state === 'ready' ? 'Ready' : DISH[state].label}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {ready && (
                <div className="border-t border-emerald-100 bg-emerald-50/60 p-2">
                  <button
                    type="button"
                    onClick={() => void serve(ticket.id)}
                    disabled={serving !== null}
                    className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-700 text-[13px] font-semibold text-white active:bg-emerald-800 disabled:opacity-60"
                  >
                    {serving === ticket.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" aria-hidden />}
                    {serving === ticket.id ? 'Marking served…' : 'Mark served'}
                  </button>
                  {failed === ticket.id && <p role="alert" className="mt-1.5 text-center text-[11px] font-medium text-rose-700">Could not save that. Please try again.</p>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default LiveTableKitchen;
