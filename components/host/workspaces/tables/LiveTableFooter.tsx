'use client';

import React from 'react';
import { inr } from './LiveTableLine';
import { LiveTableActions } from './LiveTableActions';
import type { Tender } from './useTableActions';

interface LiveTableFooterProps {
  subtotal: number;
  tax: number;
  total: number;
  hasBill: boolean;
  tableNumber: string;
  busy: 'settle' | 'release' | null;
  /** The bill is still being brought up to date, so settling waits. */
  locked?: boolean;
  error: string | null;
  onSettle: (tender: Tender) => void;
  onRelease: () => void;
  onOpenBilling: () => void;
}

/** The bill's totals, and what the host can do with the table from here. Pinned to the bottom of the panel. */
export function LiveTableFooter(props: LiveTableFooterProps) {
  const { subtotal, tax, total, hasBill } = props;
  return (
    <footer className="shrink-0 space-y-3 border-t border-neutral-100 bg-white px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] shadow-[0_-12px_24px_-20px_rgba(0,0,0,0.3)] sm:px-5">
      <div className="flex items-end justify-between gap-3">
        <div className="text-[11px] leading-tight text-neutral-500">
          <p>Subtotal <span className="font-mono text-neutral-700">{inr(subtotal)}</span></p>
          <p>Tax <span className="font-mono text-neutral-700">{inr(tax)}</span></p>
        </div>
        <p className="text-right">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Total</span>
          <span className="font-mono text-2xl font-bold leading-none text-neutral-950">{inr(total)}</span>
        </p>
      </div>
      <LiveTableActions
        tableNumber={props.tableNumber}
        hasBill={hasBill}
        total={total}
        busy={props.busy}
        locked={props.locked}
        error={props.error}
        onSettle={props.onSettle}
        onRelease={props.onRelease}
        onOpenBilling={props.onOpenBilling}
      />
    </footer>
  );
}

export default LiveTableFooter;
