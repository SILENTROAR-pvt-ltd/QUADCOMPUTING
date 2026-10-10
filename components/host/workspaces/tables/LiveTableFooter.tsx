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
  error: string | null;
  onSettle: (tender: Tender) => void;
  onRelease: () => void;
  onOpenBilling: () => void;
}

/** The bill's totals, and what the host can do with the table from here. */
export function LiveTableFooter(props: LiveTableFooterProps) {
  const { subtotal, tax, total, hasBill } = props;
  return (
    <footer className="space-y-4 border-t border-neutral-100 p-5">
      <div className="space-y-1 text-xs text-neutral-600">
        <div className="flex justify-between"><span>Subtotal</span><span className="font-mono">{inr(subtotal)}</span></div>
        <div className="flex justify-between"><span>Tax</span><span className="font-mono">{inr(tax)}</span></div>
        <div className="flex justify-between border-t border-neutral-100 pt-2 text-sm font-bold text-neutral-950">
          <span>Total</span><span className="font-mono">{inr(total)}</span>
        </div>
      </div>
      <LiveTableActions
        tableNumber={props.tableNumber}
        hasBill={hasBill}
        total={total}
        busy={props.busy}
        error={props.error}
        onSettle={props.onSettle}
        onRelease={props.onRelease}
        onOpenBilling={props.onOpenBilling}
      />
    </footer>
  );
}

export default LiveTableFooter;
