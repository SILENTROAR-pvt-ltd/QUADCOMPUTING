'use client';

import React, { useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import type { TableVisualState } from '@/lib/utils/live-table-state';
import { TABLE_STATE_STYLE } from './live-table-style';
import { LiveTableLine, type BillLine } from './LiveTableLine';
import { LiveTableFooter } from './LiveTableFooter';
import { LiveTableGuest } from './LiveTableGuest';
import { LiveTableAddItems } from './LiveTableAddItems';
import { useTableBill } from './useTableBill';
import { useTableActions } from './useTableActions';

interface LiveTableControlPanelProps {
  venueId: string;
  tableNumber: string;
  state: TableVisualState;
  onChanged: () => void;
  onOpenBilling: () => void;
  onClose: () => void;
}

const OCCUPIED: TableVisualState[] = ['live', 'occupied', 'bill_requested'];

/** The selected table: who is there, its bill to change, adding items, and settling or freeing the table. */
export function LiveTableControlPanel({ venueId, tableNumber, state, onChanged, onOpenBilling, onClose }: LiveTableControlPanelProps) {
  const [view, setView] = useState<'bill' | 'add'>('bill');
  const [confirming, setConfirming] = useState<string | null>(null);
  const bill = useTableBill(venueId, tableNumber, onChanged);
  const style = TABLE_STATE_STYLE[state];

  const subtotal = bill.order?.subtotal ?? bill.lines.reduce((sum, l) => sum + Number(l.price) * Number(l.quantity), 0);
  const tax = bill.order?.tax_amount ?? 0;
  const total = bill.order?.grand_total ?? subtotal + tax;
  const hasBill = bill.lines.length > 0;
  const showGuest = OCCUPIED.includes(state);

  const actions = useTableActions(
    venueId,
    tableNumber,
    { subtotal, tax, total, orderId: bill.order?.id ?? null },
    () => { void bill.reload(); onChanged(); },
  );

  const removeLine = async (line: BillLine) => {
    setConfirming(null);
    await bill.changeLine(line, 0);
  };

  return (
    <aside aria-label={`Table ${tableNumber} control`} className="flex h-full flex-col rounded-3xl border border-neutral-200 bg-white shadow-sm">
      <header className="flex items-start justify-between gap-3 border-b border-neutral-100 p-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Table</p>
          <h2 className="font-serif text-3xl leading-none text-neutral-950">{tableNumber}</h2>
          <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${style.chip}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} /> {style.label}
          </span>
        </div>
        <button type="button" onClick={onClose} aria-label="Close table panel" className="cursor-pointer rounded-full border border-neutral-200 p-2 text-neutral-600 hover:bg-neutral-50 lg:hidden">
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {showGuest && <LiveTableGuest session={bill.session} order={bill.order} />}

        <div role="tablist" aria-label="Table view" className="grid grid-cols-2 gap-1 rounded-xl bg-neutral-100 p-1">
          {(['bill', 'add'] as const).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)}
              className={`h-9 rounded-lg text-xs font-semibold cursor-pointer ${view === v ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500'}`}>
              {v === 'bill' ? `Bill · ${bill.lines.length}` : 'Add items'}
            </button>
          ))}
        </div>

        {bill.error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{bill.error}</p>}

        {view === 'add' ? (
          <LiveTableAddItems venueId={venueId} tableNumber={tableNumber} onAdded={() => { void bill.reload(); onChanged(); }} />
        ) : bill.loading ? (
          <p className="flex items-center gap-2 text-xs text-neutral-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading the bill…</p>
        ) : !hasBill ? (
          <div className="space-y-3 rounded-2xl border border-dashed border-neutral-300 px-4 py-8 text-center text-xs text-neutral-500">
            <p>{showGuest ? 'No items on this table yet.' : 'This table is free. Add items to seat a party.'}</p>
            <button type="button" onClick={() => setView('add')} className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-neutral-950 px-3 py-2 font-semibold text-white">
              <Plus className="h-3 w-3" /> Add items
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {bill.lines.map((line) => (
              <LiveTableLine
                key={line.id}
                line={line}
                confirming={confirming === line.id}
                removing={bill.busyLine === line.id}
                onAskRemove={() => setConfirming(line.id)}
                onConfirmRemove={() => void removeLine(line)}
                onKeep={() => setConfirming(null)}
                onQuantity={(q) => void bill.changeLine(line, q)}
              />
            ))}
          </ul>
        )}
      </div>

      <LiveTableFooter
        subtotal={subtotal}
        tax={tax}
        total={total}
        hasBill={hasBill}
        tableNumber={tableNumber}
        busy={actions.busy}
        error={actions.error}
        onSettle={(tender) => void actions.settle(tender)}
        onRelease={() => void actions.release()}
        onOpenBilling={onOpenBilling}
      />
    </aside>
  );
}

export default LiveTableControlPanel;
