'use client';

import React from 'react';
import { inr } from './LiveTableLine';
import { LiveTableActions } from './LiveTableActions';
import type { Tender, TableActionKind } from './useTableActions';

interface LiveTableFooterProps {
  subtotal: number;
  tax: number;
  total: number;
  hasBill: boolean;
  tableNumber: string;
  busy: TableActionKind | null;
  /** The bill is still being brought up to date, so sending it waits. */
  locked?: boolean;
  /** Billing has already been asked to settle this table. */
  billRequested: boolean;
  error: string | null;
  canSettle: boolean;
  onSettle: (tender: Tender) => void;
  onSendToBilling: () => void;
  onRelease: () => void;
  onOpenBilling: () => void;
}

/** The bill's totals, and what the waiter can do with the table from here. Pinned to the bottom of the panel, kept short. */
export function LiveTableFooter(props: LiveTableFooterProps) {
  const { subtotal, tax, total, hasBill } = props;
  return (
    <footer className="shrink-0 space-y-2 border-t border-neutral-100 bg-white px-4 pt-2.5 pb-[calc(env(safe-area-inset-bottom,0px)+0.625rem)] shadow-[0_-12px_24px_-20px_rgba(0,0,0,0.3)] sm:px-5">
      <div className="flex items-end justify-between gap-3">
        <p className="text-[11px] leading-snug text-neutral-500">
          Subtotal <span className="font-mono text-neutral-700">{inr(subtotal)}</span>
          <span aria-hidden className="mx-1.5 text-neutral-300">·</span>
          Tax <span className="font-mono text-neutral-700">{inr(tax)}</span>
        </p>
        <p className="flex items-baseline gap-2 text-right">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Total</span>
          <span className="font-mono text-xl font-bold leading-none text-neutral-950">{inr(total)}</span>
        </p>
      </div>
      <LiveTableActions
        tableNumber={props.tableNumber}
        hasBill={hasBill}
        total={total}
        busy={props.busy}
        locked={props.locked}
        billRequested={props.billRequested}
        error={props.error}
        canSettle={props.canSettle}
        onSettle={props.onSettle}
        onSendToBilling={props.onSendToBilling}
        onRelease={props.onRelease}
        onOpenBilling={props.onOpenBilling}
      />
    </footer>
  );
}

export default LiveTableFooter;
