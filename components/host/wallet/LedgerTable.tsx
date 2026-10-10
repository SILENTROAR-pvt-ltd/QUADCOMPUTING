'use client';

import React from 'react';
import { History, ArrowDownLeft, ArrowUpRight, BadgeCheck } from 'lucide-react';
import type { UsageLedgerItem } from '@/types/wallet';
import { describeLedger } from './ledger-format';

/** The venue's statement: credit added, plans bought and fees taken, newest first. */
export function LedgerTable({ items }: { items: UsageLedgerItem[] }) {
  return (
    <section className="rounded-2xl border border-neutral-200/90 bg-white p-5 sm:p-6 shadow-xs">
      <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
        <div className="flex items-center gap-2.5">
          <History className="w-4 h-4 text-neutral-500" />
          <h3 className="font-serif text-lg sm:text-xl font-medium tracking-tight text-neutral-900">Wallet statement</h3>
        </div>
        <span className="text-[11px] text-neutral-500">Last {items.length} entries</span>
      </div>

      {items.length === 0 ? (
        <p className="py-12 text-center text-xs text-neutral-400">Nothing yet. Credit you add and fees for bills, rooms and menu items will appear here.</p>
      ) : (
        <div className="overflow-x-auto mt-1">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-100 text-[10px] uppercase tracking-wider text-neutral-500">
                <th className="py-3 px-3 font-medium">Entry</th>
                <th className="py-3 px-3 font-medium">Reference</th>
                <th className="py-3 px-3 font-medium text-right">Amount</th>
                <th className="py-3 px-3 font-medium text-right">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {items.map((item) => {
                const d = describeLedger(item);
                const Icon = d.kind === 'credit' ? ArrowDownLeft : d.kind === 'plan' ? BadgeCheck : ArrowUpRight;
                return (
                  <tr key={item.id} className="hover:bg-neutral-50/70">
                    <td className="py-3 px-3">
                      <span className="flex items-center gap-2 font-medium text-neutral-800">
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${d.kind === 'debit' ? 'text-neutral-400' : 'text-emerald-600'}`} />{d.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[10px] text-neutral-500">{d.reference}</td>
                    <td className={`py-3 px-3 text-right font-semibold tabular-nums ${d.kind === 'debit' ? 'text-neutral-900' : 'text-emerald-700'}`}>{d.amount}</td>
                    <td className="py-3 px-3 text-right text-[11px] text-neutral-500 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
