'use client';

import { Receipt, Wallet } from 'lucide-react';
import type { LedgerOrder } from '@/lib/services/analytics/orders-ledger.util';
import { billNo, inr, istDateTime, itemsSummary, statusOf } from './ledger-format';

const STATUS_STYLE = {
  settled: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  open: 'bg-sky-50 text-sky-700 ring-sky-200',
  cancelled: 'bg-rose-50 text-rose-700 ring-rose-200',
} as const;

const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold';

/** One bill: when, who (name, wallet handle, phone), where, what, and the wallet credit used or earned. */
export function OrderLedgerRow({ order, onOpen }: { order: LedgerOrder; onOpen: (o: LedgerOrder) => void }) {
  const status = statusOf(order);
  const { guest, wallet } = order;
  return (
    <li className="rounded-2xl border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-500">
            <span className="font-medium text-neutral-700">{istDateTime(order.created_at)}</span>
            <span className="font-mono text-neutral-400">#{billNo(order)}</span>
            <span className={`${chip} capitalize ring-1 ring-inset ${STATUS_STYLE[status]}`}>{status}</span>
            {order.payment_method && <span className={`${chip} bg-neutral-100 uppercase text-neutral-700`}>{order.payment_method}</span>}
            {order.table_number && <span className={`${chip} bg-neutral-100 font-mono text-neutral-700`}>{order.table_number}</span>}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-sm font-semibold text-neutral-950">{guest.label}</span>
            {guest.handle && guest.handle !== guest.label && (
              <span className={`${chip} bg-violet-50 text-violet-700`}><Wallet className="h-3 w-3" />{guest.handle}</span>
            )}
            {guest.phone && guest.phone !== guest.label && <span className="text-xs text-neutral-500">{guest.phone}</span>}
          </div>

          <p className="mt-1.5 line-clamp-2 text-xs text-neutral-600">{itemsSummary(order) || 'No items recorded'}</p>

          {(wallet.redeemed > 0 || wallet.cashback > 0) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {wallet.redeemed > 0 && <span className={`${chip} bg-amber-50 text-amber-800`}>Wallet redeemed {inr(wallet.redeemed)}</span>}
              {wallet.cashback > 0 && <span className={`${chip} bg-emerald-50 text-emerald-700`}>Cashback {inr(wallet.cashback)}</span>}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="font-serif text-xl tabular-nums text-neutral-950">{inr(order.grand_total)}</span>
          <button type="button" onClick={() => onOpen(order)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 text-[11px] font-semibold text-neutral-800 hover:bg-neutral-50 cursor-pointer">
            <Receipt className="h-3.5 w-3.5" /> Receipt
          </button>
        </div>
      </div>
    </li>
  );
}
