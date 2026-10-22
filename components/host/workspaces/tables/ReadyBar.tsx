'use client';

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, Check, Loader2 } from 'lucide-react';
import type { KitchenTicket } from '@/lib/utils/kitchen';
import { press, SPRING } from '@/components/guest/menu/motion';

interface ReadyBarProps {
  /** Every ticket of the venue, kept live by the page. */
  tickets: KitchenTicket[];
  /** Marks a ticket served; resolves false when it could not be saved. */
  onServe: (ticketId: string) => Promise<boolean>;
  /** Opens the full Orders view. */
  onOpenOrders: () => void;
}

const SHOWN = 3;
/** Cards drawn in the bar. In a rush the rest wait behind one "+N more" card (the Orders view lists them all), so the bar
 * stays light on a phone instead of animating dozens of cards at once. The oldest ready orders are always the ones shown. */
const MAX_CARDS = 12;

/**
 * The waiter's call bar: every order the kitchen has finished, as a card with its table and dishes and one "Served" button.
 * It sits at the top of the board and appears the moment the chef marks an order ready. Serving removes the card at once.
 */
export function ReadyBar({ tickets, onServe, onOpenOrders }: ReadyBarProps) {
  const ready = useMemo(
    () => tickets.filter((t) => t.status === 'READY').sort((a, b) => Date.parse(a.updated_at || a.created_at || '') - Date.parse(b.updated_at || b.created_at || '')),
    [tickets],
  );
  const [failed, setFailed] = useState<string | null>(null);
  const [serving, setServing] = useState<string | null>(null);

  const serve = async (id: string) => {
    setServing(id);
    setFailed(null);
    const ok = await onServe(id);
    setServing(null);
    if (!ok) setFailed(id);
  };

  return (
    <AnimatePresence initial={false}>
      {ready.length > 0 && (
        <motion.section key="ready-bar" aria-label="Ready to serve" role="status"
          initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -10, height: 0 }} transition={SPRING}
          className="overflow-hidden rounded-3xl border border-emerald-200 bg-emerald-50/70">
          <div className="flex items-center justify-between gap-2 px-4 pt-3">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-emerald-900">
              <BellRing className="h-4 w-4 animate-pulse" aria-hidden /> {ready.length} ready to serve
            </p>
            <button type="button" onClick={onOpenOrders} className="min-h-10 cursor-pointer text-[12px] font-semibold text-emerald-800 underline-offset-2 hover:underline">All orders</button>
          </div>
          <ul className="flex gap-2.5 overflow-x-auto px-3 pb-3 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <AnimatePresence initial={false}>
              {ready.slice(0, MAX_CARDS).map((t) => {
                const items = t.items || [];
                return (
                  <motion.li key={t.id} layout exit={{ opacity: 0, scale: 0.9 }} transition={SPRING}
                    className="flex w-[210px] shrink-0 flex-col rounded-2xl border border-emerald-200 bg-white p-3 shadow-sm">
                    <p className="font-serif text-xl leading-none text-neutral-950">{t.table_or_room || 'Counter'}</p>
                    <ul className="mt-2 flex-1 space-y-0.5 text-[12.5px] text-neutral-700">
                      {items.slice(0, SHOWN).map((it, i) => (
                        <li key={i} className="truncate"><span className="font-mono font-bold">{Math.max(1, Number(it.qty) || 1)}×</span> {it.name}</li>
                      ))}
                      {items.length > SHOWN && <li className="text-[11px] text-neutral-400">+ {items.length - SHOWN} more</li>}
                    </ul>
                    <motion.button type="button" onClick={() => void serve(t.id)} disabled={serving === t.id} {...press}
                      className="mt-3 flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-emerald-700 text-[13px] font-semibold text-white disabled:opacity-60">
                      {serving === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" aria-hidden />} Served
                    </motion.button>
                    {failed === t.id && <p role="alert" className="mt-1.5 text-center text-[11px] font-medium text-rose-700">Could not save. Try again.</p>}
                  </motion.li>
                );
              })}
            </AnimatePresence>
            {ready.length > MAX_CARDS && (
              <li className="flex w-[150px] shrink-0">
                <button type="button" onClick={onOpenOrders}
                  className="flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-300 bg-white/70 p-3 text-center text-emerald-900">
                  <span className="font-serif text-2xl leading-none">+{ready.length - MAX_CARDS}</span>
                  <span className="mt-1 text-[12px] font-semibold">more ready · All orders</span>
                </button>
              </li>
            )}
          </ul>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
